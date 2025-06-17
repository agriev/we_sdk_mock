import update from 'ramda/src/update';
import curry from 'ramda/src/curry';
import findIndex from 'ramda/src/findIndex';
import append from 'ramda/src/append';

/**
 * Заменить объект в массиве объектов по его id
 * @param {Number} eqFunc функция, которая ищет нужный объект
 * @param {Function} newItem новый элемент
 * @param {Array} arr массив объектов
 */
const replaceOrAddByFunc = curry((eqFunc, newItem, arrayArg) => {
  const array = arrayArg || [];
  const idx = findIndex(eqFunc, array);

  if (idx >= 0) {
    return update(idx, newItem, array);
  }

  return append(newItem, array);
});

export default replaceOrAddByFunc;
