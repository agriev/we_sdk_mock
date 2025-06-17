/*!
 * frontend_sdk/index.js
 * Functional replacement for WeChat JS-SDK, targeting We Platform backend.
 * Version: 0.1.0
 */

(function (global) {
  'use strict';

  if (global.wx) {
    console.warn('[frontend_sdk] window.wx already exists – will be overwritten.');
  }

  const API_BASE = '/api';
  const TOKEN_KEY = 'we_platform_token';

  function _getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function _setToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function _request(path, options = {}) {
    const token = _getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(API_BASE + path, {
      credentials: 'include',
      ...options,
      headers,
    });
    if (!res.ok) {
      throw new Error(`Request failed ${res.status}`);
    }
    return res.json();
  }

  const wx = {};
  let _ready = false;
  let _readyQueue = [];

  wx.config = function (options) {
    console.info('[frontend_sdk] wx.config called', options);
    // Optionally fetch server side signature/permission.
    // For this custom platform we simply mark ready.
    _ready = true;
    _readyQueue.forEach((cb) => cb());
    _readyQueue = [];
  };

  wx.ready = function (cb) {
    if (_ready) cb();
    else _readyQueue.push(cb);
  };

  wx.error = function (cb) {
    // TODO: call error handler when _request fails
    console.warn('[frontend_sdk] .error is not fully implemented');
  };

  /* --- Auth helpers --- */
  wx.login = async function (opt = {}) {
    try {
      const res = await _request('/auth/token', {
        method: 'POST',
        body: JSON.stringify({ username: opt.username, password: opt.password }),
      });
      opt.success && opt.success(res);
      _setToken(res.access_token);
    } catch (e) {
      opt.fail && opt.fail(e);
    } finally {
      opt.complete && opt.complete();
    }
  };

  /* --- Game catalog --- */
  wx.getGameList = async function (opt = {}) {
    try {
      const res = await _request('/games');
      opt.success && opt.success(res);
    } catch (e) {
      opt.fail && opt.fail(e);
    } finally {
      opt.complete && opt.complete();
    }
  };

  /* --- Payment --- */
  wx.chooseWXPay = async function (opt = {}) {
    try {
      const res = await _request('/payments/create', {
        method: 'POST',
        body: JSON.stringify({ game_id: opt.gameId, amount: opt.amount, currency: opt.currency }),
      });
      opt.success && opt.success(res);
    } catch (e) {
      opt.fail && opt.fail(e);
    } finally {
      opt.complete && opt.complete();
    }
  };

  /* Example stub for getLocation using browser Geolocation API */
  wx.getLocation = function (opt = {}) {
    if (!navigator.geolocation) {
      const err = { errMsg: 'getLocation:fail permission denied' };
      opt.fail && opt.fail(err);
      opt.complete && opt.complete(err);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const res = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: pos.coords.speed || 0,
          accuracy: pos.coords.accuracy,
          errMsg: 'getLocation:ok',
        };
        opt.success && opt.success(res);
        opt.complete && opt.complete(res);
      },
      (err) => {
        const res = { errMsg: 'getLocation:fail ' + err.message };
        opt.fail && opt.fail(res);
        opt.complete && opt.complete(res);
      }
    );
  };

  /* --- Share stubs using Web Share API if available --- */
  function _share(opt) {
    if (navigator.share) {
      navigator
        .share({
          title: opt.title,
          text: opt.desc,
          url: opt.link || location.href,
        })
        .then(() => opt.success && opt.success({ errMsg: 'share:ok' }))
        .catch((e) => opt.fail && opt.fail({ errMsg: 'share:fail ' + e.message }));
    } else {
      opt.fail && opt.fail({ errMsg: 'share:fail navigator.share not supported' });
    }
  }

  wx.updateAppMessageShareData = _share;
  wx.updateTimelineShareData = _share;
  wx.onMenuShareAppMessage = _share;
  wx.onMenuShareTimeline = _share;

  wx.setToken = _setToken;
  wx.getToken = _getToken;

  // Expose to global
  global.wx = wx;
})(typeof window !== 'undefined' ? window : global); 