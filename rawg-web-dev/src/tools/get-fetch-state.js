import PropTypes from 'prop-types';

export const fetchStateType = PropTypes.shape({
  app: PropTypes.shape({
    request: PropTypes.object.isRequired,
    token: PropTypes.string,
    locale: PropTypes.string.isRequired,
  }).isRequired,
});

/**
 * Хелпер подготавливает redux-like объект state для метода
 * fetch, который используется в проекте повсеместно.
 *
 * Этот хелпер удобно использовать в реакт компонентах внутри connect,
 * тогда, когда мы выполняем fetch прямо внутри них.
 */
const getFetchState = (state) => {
  const { request, token, locale, previousPage } = state.app;

  return {
    app: { request, token, locale, previousPage },
  };
};

export default getFetchState;
