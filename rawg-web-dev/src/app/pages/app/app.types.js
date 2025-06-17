import PropTypes from 'prop-types';

import config from 'config/config';
import { appThemes } from 'app/pages/app/app.consts';

export const appTokenType = PropTypes.string;

export const request = PropTypes.shape({
  headers: PropTypes.object,
});
export const appSizeType = PropTypes.oneOf(['desktop', 'phone']);
export const os = PropTypes.string;
export const appFirstRenderType = PropTypes.bool;
export const firstPage = PropTypes.bool;
export const savedPage = PropTypes.string;
export const savedPageForce = PropTypes.bool;
export const messages = PropTypes.shape({
  en: PropTypes.object,
});
export const appLocaleType = PropTypes.oneOf(config.locales);
export const appThemeType = PropTypes.oneOf(appThemes);
export const embedded = PropTypes.bool;
export const status = PropTypes.number;
export const loading = PropTypes.bool;
export const appFeedCountersType = PropTypes.shape({
  you: PropTypes.number,
  following: PropTypes.number,
  notifications: PropTypes.number,
  total: PropTypes.number,
});
export const appRatingsType = PropTypes.array;
export const appReactionsType = PropTypes.array;
export const platforms = PropTypes.arrayOf(
  PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    slug: PropTypes.string.isRequired,
  }),
);
export const genres = PropTypes.arrayOf(
  PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    slug: PropTypes.string.isRequired,
  }),
);
export const esrbRatings = PropTypes.arrayOf(
  PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    slug: PropTypes.string.isRequired,
  }),
);
export const publishers = PropTypes.shape({
  loading: PropTypes.bool.isRequired,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
    }),
  ).isRequired,
});
export const developers = PropTypes.shape({
  loading: PropTypes.bool.isRequired,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
    }),
  ).isRequired,
});
export const showComment = PropTypes.number;
export const customNotification = PropTypes.any;
export const authProviderError = PropTypes.string;

// Ползователь попал на страницу регистрации со страницы токенов?
export const registeredFromTokensPage = PropTypes.bool;

// Шапка сайта убрана вверх? (используется на главной при активных сториз)
export const headerVisible = PropTypes.bool;

// Не совсем свойство нашего приложения, но куда-то надо было засунуть
// это определение объекта текущей локации из react-router'а
export const location = PropTypes.shape({
  action: PropTypes.string.isRequired,
  hash: PropTypes.string.isRequired,
  key: PropTypes.string,
  pathname: PropTypes.string.isRequired,
  query: PropTypes.shape().isRequired,
  search: PropTypes.string.isRequired,
});

const appTypes = PropTypes.shape({
  token: appTokenType,
  request,
  size: appSizeType,
  locale: appLocaleType,
  os,
  firstRender: appFirstRenderType,
  firstPage,
  savedPage,
  savedPageForce,
  messages,
  embedded,
  status,
  loading,
  feedCounters: appFeedCountersType,
  ratings: appRatingsType,
  reactions: appReactionsType,
  platforms,
  genres,
  esrbRatings,
  showComment,
  customNotification,
  authProviderError,
  registeredFromTokensPage,
  headerVisible,
});

export default appTypes;
