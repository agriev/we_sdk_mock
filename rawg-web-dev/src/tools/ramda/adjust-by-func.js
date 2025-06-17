import adjust from 'ramda/src/adjust';
import curry from 'ramda/src/curry';
import findIndex from 'ramda/src/findIndex';

/**
 * Заменить объект в массиве объектов по его id
 * @param {Number} eqFunc функция, которая ищет нужный объект
 * @param {Function} changeFunc функция, в которую будет передано
 * текущее значение, и которая должна вернуть изменённое
 * @param {Array} arr массив объектов
 */
const adjustByFunc = curry((eqFunc, changeFunc, array) => {
  const idx = findIndex(eqFunc, array);

  if (idx >= 0) {
    return adjust(idx, changeFunc, array);
  }

  return array;
});

export default adjustByFunc;
