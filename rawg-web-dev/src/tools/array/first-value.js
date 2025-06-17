import has from 'lodash/has';

const firstValue = (func, array) => {
  for (const idx in array) {
    if (has(array, idx)) {
      const value = func(array[idx], idx);

      if (value !== undefined) {
        return value;
      }
    }
  }

  return undefined;
};

export default firstValue;
