/* Generated copy of SDK */

// eslint-disable-next-line import/no-unresolved

// eslint-disable-next-line 

/* eslint-disable */
import axios from 'axios';

(function (global) {
  const BASE_URL = global.__SDK_BASE_URL__ || '';
  const storagePrefix = 'wg_sdk_';

  function setStorageSync(key, value) {
    sessionStorage.setItem(storagePrefix + key, JSON.stringify(value));
  }

  function getStorageSync(key) {
    const raw = sessionStorage.getItem(storagePrefix + key);
    return raw ? JSON.parse(raw) : null;
  }

  function removeStorageSync(key) {
    sessionStorage.removeItem(storagePrefix + key);
  }

  async function login() {
    const cached = getStorageSync('token');
    if (cached) return cached;
    // anonymous login to backend -> returns access token
    const resp = await axios.post(`${BASE_URL}/api/auth/anonymous/`).catch(() => null);
    if (!resp || resp.status !== 200) {
      throw new Error('login failed');
    }
    const data = resp.data;
    setStorageSync('token', data);
    return data;
  }

  async function requestPayment({ gameId, amount }) {
    const { access } = await login();
    const resp = await axios.post(`${BASE_URL}/api/payments/`, {
      game: gameId,
      amount: amount,
      currency: 'USD'
    }, {
      headers: {
        Authorization: `Bearer ${access}`
      }
    });
    return resp.data;
  }

  function shareAppMessage({ title, imageUrl, url }) {
    if (navigator.share) {
      navigator.share({ title, text: title, url: url || location.href });
    } else {
      console.log('share', { title, imageUrl, url });
      alert('Share: ' + (url || location.href));
    }
  }

  const wx = {
    login,
    requestPayment,
    setStorageSync,
    getStorageSync,
    removeStorageSync,
    shareAppMessage
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = wx;
  } else {
    global.wx = wx;
  }
})(typeof window !== 'undefined' ? window : global); 