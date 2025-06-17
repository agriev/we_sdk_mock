import adjust from 'ramda/src/adjust';
import curry from 'ramda/src/curry';

import findIndexByProp from './find-index-by-property';

/**
 * Заменить объект в массиве объектов по его id
 * @param {Number} id айдишник объекта
 * @param {Function} func функция, в которую будет передано
 * текущее значение, и которая должна вернуть изменённое
 * @param {Array} arr массив объектов
 */
const adjustByProperty = curry((property, id, func, array) => {
  const idx = findIndexByProp(property, id, array);

  if (idx >= 0) {
    return adjust(idx, func, array);
  }

  return array;
});

export default adjustByProperty;
