import shouldUpdate from 'recompose/shouldUpdate';
import shallowEqual from 'recompose/shallowEqual';
import setDisplayName from 'recompose/setDisplayName';
import wrapDisplayName from 'recompose/wrapDisplayName';

/**
 * Это аналог функции onlyUpdateForKeys из recompose, который позволяет
 * брать определённые вложенные ключи из объектов с помощью пользовательской ф-ии.
 *
 * @param {array} checkFunc
 * Функция, которой передаются пропсы, и котораядолжна вернуть объект с пропсами для сравнения.
 *
 */
const onlyUpdateForKeysFunc = (checkFunc, debug = false) => {
  const hoc = shouldUpdate((props, nextProperties) => {
    const result = !shallowEqual(checkFunc(props), checkFunc(nextProperties));

    if (debug) {
      /* eslint-disable no-console */
      console.log({
        props: checkFunc(props),
        nextProps: checkFunc(nextProperties),
        result,
      });
    }

    return result;
  });

  if (process.env.NODE_ENV !== 'production') {
    return (BaseComponent) =>
      setDisplayName(wrapDisplayName(BaseComponent, 'onlyUpdateForKeysFunc'))(hoc(BaseComponent));
  }

  return hoc;
};

export default onlyUpdateForKeysFunc;
