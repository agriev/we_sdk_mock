import shouldUpdate from 'recompose/shouldUpdate';
import shallowEqual from 'recompose/shallowEqual';
import setDisplayName from 'recompose/setDisplayName';
import wrapDisplayName from 'recompose/wrapDisplayName';
import get from 'lodash/get';

const check = (object1, object2, key, debug = false) => {
  const value1 = get(object1, key);
  const value2 = get(object2, key);
  const result = shallowEqual(value1, value2);

  if (result === false && debug) {
    // eslint-disable-next-line no-console
    console.log(`KEY ${key} IS DIFFERENT`, { object1, object2 });
  }

  return result;
};

/**
 * Это аналог функции onlyUpdateForKeys из recompose, который позволяет
 * брать определённые вложенные ключи из объектов и сравнивать их между собой.
 *
 * @param {array} propKeys Список свойств, которые необходимо сравнить
 *
 * Пример использования: onlyUpdateForKeysDeep([ 'search.games.results', 'search.users.results' ])
 */
const onlyUpdateForKeysDeep = (propertyKeys, debug = false) => {
  const hoc = shouldUpdate((props, nextProperties) =>
    propertyKeys.some((key) => !check(props, nextProperties, key, debug)),
  );

  if (process.env.NODE_ENV !== 'production') {
    return (BaseComponent) =>
      setDisplayName(wrapDisplayName(BaseComponent, 'onlyUpdateForKeysDeep'))(hoc(BaseComponent));
  }

  return hoc;
};

export default onlyUpdateForKeysDeep;
