/**
 * Разбивает длинную строку на несколько частей пробелами
 *
 * @param {string} name - строка для проверки
 * @param {number} length - длина слов на которые бить строку
 * @returns string
 */
export default function nameSplit(name, length) {
  return name.length > length && name.slice(0, length).includes(' ')
    ? name
    : `${name.slice(0, length)} ${name.slice(length, name.length)}`;
}
