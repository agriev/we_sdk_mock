import findIndex from 'ramda/src/findIndex';
import propEq from 'ramda/src/propEq';
import curry from 'ramda/src/curry';

/**
 * Найти индекс объекта в массие по определённому свойству
 * @param {String} prop имя свойства
 * @param {*} val значение, которому должно равняться это свойство
 * @param {Array} arr массив объектов
 */
const findIndexByProperty = curry((property, value, array) => findIndex(propEq(property, value), array));

export default findIndexByProperty;
