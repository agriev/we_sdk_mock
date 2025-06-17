import storage from 'tools/storage';

const IMPORT_STARTED_KEY = (provider) => `import-done-${provider}`;
const CLOSE_IMPORT_KEY = 'close-import-page';
const HIDE_STORE_KEY = 'close-store-card';

export const setCloseImportPage = (store) => {
  const key = `${CLOSE_IMPORT_KEY}-${store}`;
  storage.set(key, true);
};

export const resetCloseImportPage = (store) => {
  const key = `${CLOSE_IMPORT_KEY}-${store}`;
  storage.remove(key);
};

export const addHidingStore = (store) => {
  const key = `${HIDE_STORE_KEY}-${store}`;
  storage.set(key, true);
};

export const checkHidingStore = (store) => {
  const key = `${HIDE_STORE_KEY}-${store}`;
  return !!storage.get(key);
};

export const isImportStarted = (provider) => !!storage.get(IMPORT_STARTED_KEY(provider));

export const setImportStarted = (provider) => {
  storage.set(IMPORT_STARTED_KEY(provider), true);
};

export const resetImportStarted = (provider) => {
  storage.remove(IMPORT_STARTED_KEY(provider));
};
