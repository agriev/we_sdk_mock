import isArray from 'lodash/isArray';
import isNil from 'lodash/isNil';

const whenData = (data, func, def) => {
  if (isArray(data)) {
    for (const idx in data) {
      if (isNil(data[idx])) {
        return def;
      }
    }
  } else if (isNil(data)) {
    return def;
  }

  return func();
};

export default whenData;
