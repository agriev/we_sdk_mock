import storage from 'tools/storage';

const IS_NEW_USER_KEY = 'is-new-user';

export const isNewUser = () => !!storage.get(IS_NEW_USER_KEY);
export const setIsNewUser = () => storage.set(IS_NEW_USER_KEY, true);
export const resetIsNewUser = () => storage.remove(IS_NEW_USER_KEY);
