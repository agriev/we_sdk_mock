// При работе с изоморфным приложением, нам необходимо получать Cookies
// немного по-разному, когда речь идёт о серверном рендере и работе клиентского приложения..

import cookies from 'browser-cookies';
import defaultTo from 'lodash/defaultTo';

/**
 * Функция обращается к кукам и находит хранимое там булево свойство (true или false), либо
 * возвращает указанное значение по умолчанию.
 *
 * @param {object} requestCookies Объект cookies при серверном рендере со стороны запроса клиента
 * @param {string} key Ключ, на который следует получить значение
 * @param {mixed} byDefault Значение по умолчанию, если кука не установлена
 */
const getBooleanCookie = (requestCookies, key, byDefault) => {
  if (typeof window !== 'undefined') {
    return defaultTo(JSON.parse(cookies.get(key)), byDefault);
  }

  const cookieValue = (requestCookies || {})[key] || null;

  return defaultTo(JSON.parse(cookieValue), byDefault);
};

export default getBooleanCookie;
