
/*!
 * we_sdk_mock.js
 * Minimal mock of WeChat JS‑SDK (H5) for local testing / platform porting.
 * Version: 0.1.0
 * Author: ChatGPT mock generator
 *
 * NOTE: This file only emulates the public interface (function names & signatures)
 *       so that existing WeChat‑targeted H5 games can run without modification.
 *       Each method either calls a stub (console log) or returns a dummy result.
 *       Replace the inside of each stub with real logic that talks to your backend.
 */
(function (global) {
  'use strict';

  // Ensure no accidental override
  if (global.wx) {
    console.warn('[we_sdk_mock] window.wx already exists – keeping the original object.');
    return;
  }

  const wx = {};
  let _ready = false;
  let _readyQueue = [];
  let _errorHandler = null;

  /***********************
   * Core initialisation *
   ***********************/
  wx.config = function (options) {
    console.info('[we_sdk_mock] wx.config called:', options);
    // Simulate asynchronous signature check delay
    setTimeout(() => {
      _ready = true;
      _readyQueue.forEach(cb => typeof cb === 'function' && cb());
      _readyQueue = [];
    }, 10);
  };

  wx.ready = function (callback) {
    if (_ready) {
      callback();
    } else {
      _readyQueue.push(callback);
    }
  };

  wx.error = function (callback) {
    _errorHandler = callback;
  };

  /*******************
   * Helper function *
   *******************/
  function _successOnlyStub(apiName, opt = {}) {
    console.warn('[we_sdk_mock]', apiName, 'is a stub, returning success immediately.');
    if (typeof opt.success === 'function') {
      opt.success({ errMsg: apiName + ':ok' });
    }
    if (typeof opt.complete === 'function') {
      opt.complete({ errMsg: apiName + ':ok' });
    }
  }

  /**********************
   * API Implementations
   * (minimal stubs)
   **********************/

  // Check available APIs
  wx.checkJsApi = function (opt) {
    const result = {};
    (opt.jsApiList || []).forEach(name => { result[name] = true; });
    opt.success && opt.success({ checkResult: result, errMsg: 'checkJsApi:ok' });
  };

  /* --- Sharing --- */
  wx.updateAppMessageShareData = function (opt) { _successOnlyStub('updateAppMessageShareData', opt); };
  wx.updateTimelineShareData = function (opt) { _successOnlyStub('updateTimelineShareData', opt); };
  wx.onMenuShareAppMessage = function (opt) { _successOnlyStub('onMenuShareAppMessage', opt); };
  wx.onMenuShareTimeline = function (opt) { _successOnlyStub('onMenuShareTimeline', opt); };

  /* --- Payment --- */
  wx.chooseWXPay = function (opt) { _successOnlyStub('chooseWXPay', opt); };

  /* --- Geolocation --- */
  wx.getLocation = function (opt) {
    console.warn('[we_sdk_mock] getLocation returning dummy coords.');
    const res = { latitude: 0.0, longitude: 0.0, speed: 0, accuracy: 0, errMsg: 'getLocation:ok' };
    opt.success && opt.success(res);
  };
  wx.openLocation = function (opt) { _successOnlyStub('openLocation', opt); };

  /* --- QR / Barcode --- */
  wx.scanQRCode = function (opt) {
    console.warn('[we_sdk_mock] scanQRCode stub – returning fake result.');
    const res = { resultStr: 'MOCK_QR_RESULT', errMsg: 'scanQRCode:ok' };
    opt.success && opt.success(res);
  };

  /* --- Media --- */
  wx.chooseImage = function (opt) { _successOnlyStub('chooseImage', opt); };
  wx.previewImage = function (opt) { _successOnlyStub('previewImage', opt); };
  wx.uploadImage = function (opt) { _successOnlyStub('uploadImage', opt); };
  wx.downloadImage = function (opt) { _successOnlyStub('downloadImage', opt); };

  /* --- Window control --- */
  wx.hideOptionMenu = function () { console.info('[we_sdk_mock] hideOptionMenu'); };
  wx.showOptionMenu = function () { console.info('[we_sdk_mock] showOptionMenu'); };
  wx.closeWindow = function () { console.info('[we_sdk_mock] closeWindow'); };

  /****************
   * Misc helpers *
   ****************/
  wx.getNetworkType = function (opt) {
    opt.success && opt.success({ networkType: 'wifi', errMsg: 'getNetworkType:ok' });
  };

  /* Storage proxy */
  wx.setStorageSync = function (key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error(e); }
  };
  wx.getStorageSync = function (key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  };

  /******************
   * Export to global
   ******************/
  global.wx = wx;
})(typeof window !== 'undefined' ? window : global);
