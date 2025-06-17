import memoize from 'fast-memoize';
import env from 'config/env';

/**
 * Так как на Node.js мемоизация иногда может привести к сильным утечкам
 * памяти, иногда более целесообразно выполнять мемоизацию только на клиенте.
 *
 * @param {Function} func Функция, работу которой хочется мемоизировать
 */
const memoizeOnClient = (func) => {
  if (env.isClient()) {
    return memoize(func);
  }

  return func;
};

export default memoizeOnClient;
