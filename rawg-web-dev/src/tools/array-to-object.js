/**
 * Создает объект с ключами из изначального массива с объектами.
 * Скажем, есть такой массив:
 * const users = [ { name: 'roman', id: 1 }, { name: 'vasya', id: 2 } ]
 *
 * Мы можем применить к нему эту функцию:
 * const usersobj = arrayToObject(users, 'id', 'user')
 *
 * Итоговый результат будет следующим:
 * {
 *  'user1': {
 *   id: 1,
 *   name: 'roman'
 *  },
 *  'user2': {
 *   id: 2,
 *   name: 'vasya'
 *  }
 * }
 *
 * Т.е. мы из массива получили объект с ключами.
 *
 * @param {array} arr Исходный массив
 * @param {string} key Ключ в объектах массива для уникальности ключей в конечном объекте
 * @param {string} prefix Префикс для ключей будущего объекта
 */
export default function arrayToObject(array, key, prefix = '') {
  return (Array.isArray(array) ? array : []).reduce(
    (object, element) => ({
      ...object,
      [`${prefix}${element[key]}`]: element,
    }),
    {},
  );
}
