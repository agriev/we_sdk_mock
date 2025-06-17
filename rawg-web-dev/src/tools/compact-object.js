import omitBy from 'lodash/omitBy';
import isPlainObject from 'lodash/isPlainObject';
import isNil from 'lodash/isNil';

const isEmpty = (value) => {
  if (isPlainObject(value)) {
    return Object.keys(value).length === 0;
  }

  return isNil(value);
};

const compactObject = (object, checkFunc) => omitBy(object || {}, checkFunc || isEmpty);

export default compactObject;
