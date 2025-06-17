const hasStorage = () => typeof window !== 'undefined' && window.localStorage;

function set(key, value) {
  if (hasStorage()) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function get(key) {
  if (hasStorage()) {
    const value = window.localStorage.getItem(key);
    if (value) {
      return JSON.parse(value);
    }
  }

  return null;
}

function remove(key) {
  if (hasStorage()) {
    window.localStorage.removeItem(key);
  }
}

function clear() {
  if (hasStorage()) {
    window.localStorage.clear();
  }
}

export default {
  set,
  get,
  remove,
  clear,
};
