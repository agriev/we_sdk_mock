/* eslint-disable eqeqeq, no-console */

import get from 'lodash/get';
import isFunction from 'lodash/isFunction';
import shallowEqual from './shallow-equal';

const check = (object1, object2, key, debug) => {
  const value1 = get(object1, key);
  const value2 = get(object2, key);

  return shallowEqual(value1, value2, { debug });
};

const keysEqual = (object1, object2, keys, { debug = false, depth } = {}) => {
  if (Array.isArray(keys)) {
    return keys.every((key) => check(object1, object2, key, debug));
  }

  if (isFunction(keys)) {
    return shallowEqual(keys(object1), keys(object2), { debug, depth });
  }

  return false;
};

export default keysEqual;
