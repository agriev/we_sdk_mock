import get from 'lodash/get';

const len = (object, property) => {
  if (property) {
    return get(object, `${property}.length`, 0);
  }

  return get(object, 'length', 0);
};

export default len;
