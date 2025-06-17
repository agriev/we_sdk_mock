import storage from 'tools/storage';

const STORAGE_KEY = 'cookie-message-close';

const cookieStorage = {
  hideBanner() {
    storage.set(STORAGE_KEY, true);
  },

  isHidden(locale) {
    const hidden = storage.get(STORAGE_KEY);
    return locale !== 'en' || hidden === true;
  },
};

export default cookieStorage;
