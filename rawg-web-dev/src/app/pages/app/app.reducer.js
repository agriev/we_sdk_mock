import { CURRENT_USER_LOGOUT } from 'app/components/current-user/current-user.actions';
import { defaultTheme, defaultOnlyMyPlatforms } from 'app/pages/app/app.consts';
import { SET_THEME } from 'app/components/theme-switcher/theme-switcher.actions';
import { SET_ONLY_MY_PLATFORMS } from 'app/components/switcher-only-my-platforms/switcher.actions';

import { CUSTOM_NOTIFICATION } from './components/notifications/notifications.actions';

import {
  FIRST_RENDER_END,
  SECOND_PAGE_SHOWN,
  AUTH_SUCCESS,
  AUTH_PROVIDER_MESSAGE_ERROR,
  DISPLAY_RESIZE,
  SAVE_PAGE,
  STATUS,
  RESPONSE_HEADER,
  LOADING,
  FEED_COUNTERS,
  RATINGS,
  REACTIONS,
  PLATFORMS,
  GAMES_COUNT,
  STORES,
  GENRES,
  PUBLISHERS,
  PUBLISHERS_LOADING,
  SHOW_COMMENT,
  COMMENT_SHOWN,
  REGISTER_FROM_TOKENS_PAGE,
  DEVELOPERS,
  DEVELOPERS_LOADING,
  ESRB_RATINGS,
  SET_PRIVATE_PAGE,
  SET_HEDAER_VISIBILITY,
  ANALYTICS_INITIALIZED,
  AUTH_FROM_RATE_CARDS_START,
  AUTH_FROM_RATE_CARDS_END,
  SET_PREVIOUS_PAGE,
  TOGGLE_PROFILE_IFRAME_VISIBILITY,
} from './app.actions';

export const initialState = {
  token: '',
  request: {
    headers: {},
    isSpider: false,
    path: '',
  },
  socialAuthFromRateCards: false,
  size: 'desktop',
  os: '',
  firstRender: true,
  firstPage: true,
  savedPage: '',
  savedPageForce: false,
  currentPageIsPrivate: false,
  previousPage: null,
  messages: {
    en: {},
  },
  locale: '',
  settings: {
    theme: defaultTheme,
    showOnlyMyPlatforms: defaultOnlyMyPlatforms,
  },
  embedded: false,
  status: 200,
  responseHeaders: {},
  loading: false,
  feedCounters: {
    you: 0,
    following: 0,
    notifications: 0,
    total: 0,
  },
  ratings: [],
  reactions: [],
  platforms: [],
  genres: [],
  stores: [],
  publishers: {
    loading: false,
    results: [],
  },
  developers: {
    loading: false,
    results: [],
  },
  esrbRatings: [],
  showComment: null,
  customNotification: null,
  authProviderError: null,
  registeredFromTokensPage: false,
  headerVisible: true,
  analyticsInitialized: false,
  gamesCount: 0,
  profileIframeVisibility: '',
  profileIframeCallback: null,
};

export default function app(state = initialState, action) {
  // eslint-disable-next-line sonarjs/max-switch-cases
  switch (action.type) {
    case FIRST_RENDER_END:
      return {
        ...state,
        firstRender: false,
      };

    case SECOND_PAGE_SHOWN:
      return {
        ...state,
        firstPage: false,
      };

    case DISPLAY_RESIZE:
      return {
        ...state,
        size: action.data.size,
      };

    case REGISTER_FROM_TOKENS_PAGE:
      return {
        ...state,
        registeredFromTokensPage: true,
      };

    case AUTH_SUCCESS:
      return {
        ...state,
        token: action.data.token,
      };

    case CURRENT_USER_LOGOUT:
      return {
        ...state,
        token: '',
      };

    case AUTH_PROVIDER_MESSAGE_ERROR: {
      const errors = (action.data.err && action.data.err.errors) || {};

      return {
        ...state,
        authProviderError: errors.error || errors.statusText,
      };
    }

    case AUTH_FROM_RATE_CARDS_START: {
      return {
        ...state,
        socialAuthFromRateCards: true,
      };
    }

    case AUTH_FROM_RATE_CARDS_END: {
      return {
        ...state,
        socialAuthFromRateCards: false,
      };
    }

    case SAVE_PAGE:
      return {
        ...state,
        savedPage: action.data.pathname,
        savedPageForce: action.data.force,
        savedPageHelmet: action.data.helmet,
      };

    case STATUS:
      return {
        ...state,
        status: action.data.status,
      };

    case RESPONSE_HEADER:
      return {
        ...state,
        responseHeaders: {
          ...state.responseHeaders,
          [action.data.name]: action.data.value,
        },
      };

    case LOADING:
      return {
        ...state,
        loading: action.data.loading,
      };

    case FEED_COUNTERS:
      return {
        ...state,
        feedCounters: {
          ...state.feedCounters,
          ...action.data,
        },
      };

    case RATINGS:
      return {
        ...state,
        ratings: action.data,
      };

    case REACTIONS:
      return {
        ...state,
        reactions: action.data,
      };

    case PLATFORMS:
      return {
        ...state,
        platforms: action.data,
      };

    case GAMES_COUNT:
      return {
        ...state,
        gamesCount: action.data,
      };

    case STORES:
      return {
        ...state,
        stores: action.data,
      };

    case GENRES:
      return {
        ...state,
        genres: action.data,
      };

    case PUBLISHERS_LOADING:
      return {
        ...state,
        publishers: {
          ...state.publishers,
          loading: true,
          results: [],
        },
      };

    case PUBLISHERS:
      return {
        ...state,
        publishers: {
          ...state.publishers,
          loading: false,
          results: action.data,
        },
      };

    case DEVELOPERS_LOADING:
      return {
        ...state,
        developers: {
          ...state.developers,
          loading: true,
          results: [],
        },
      };

    case DEVELOPERS:
      return {
        ...state,
        developers: {
          ...state.developers,
          loading: false,
          results: action.data,
        },
      };

    case ESRB_RATINGS:
      return {
        ...state,
        esrbRatings: action.data,
      };

    case SHOW_COMMENT:
      return {
        ...state,
        showComment: parseInt(action.data.id, 10),
      };

    case COMMENT_SHOWN:
      return {
        ...state,
        showComment: null,
      };

    case CUSTOM_NOTIFICATION:
      return {
        ...state,
        customNotification: action.data,
      };

    case SET_PRIVATE_PAGE:
      return {
        ...state,
        currentPageIsPrivate: action.data,
      };

    case SET_HEDAER_VISIBILITY:
      return {
        ...state,
        headerVisible: action.data,
      };

    case ANALYTICS_INITIALIZED:
      return {
        ...state,
        analyticsInitialized: true,
      };

    case SET_THEME:
      return {
        ...state,
        settings: {
          ...state.settings,
          theme: action.data.theme,
        },
      };

    case SET_ONLY_MY_PLATFORMS:
      return {
        ...state,
        settings: {
          ...state.settings,
          showOnlyMyPlatforms: action.data.enabled,
        },
      };

    case SET_PREVIOUS_PAGE:
      return {
        ...state,
        previousPage: action.data.previousPage,
      };

    case TOGGLE_PROFILE_IFRAME_VISIBILITY:
      return {
        ...state,

        profileIframeVisibility: action.data.profileIframeVisibility,
        profileIframeCallback: action.data.profileIframeCallback,
      };

    default:
      return state;
  }
}
