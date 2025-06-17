import {
  TOKENS_DATA_EARNED_ACHIEVEMENTS_LOAD_SUCCESS,
  TOKENS_DATA_EARNED_ACHIEVEMENTS_LOAD,
  TOKENS_DATA_RECOMMENDED_GAMES_LOAD,
  TOKENS_DATA_RECOMMENDED_GAMES_LOAD_SUCCESS,
  TOKENS_DATA_LEADERBOARD_FIRST_LOAD,
  TOKENS_DATA_LEADERBOARD_FIRST_LOAD_SUCCESS,
  TOKENS_DATA_LEADERBOARD_USER_LOAD,
  TOKENS_DATA_LEADERBOARD_USER_LOAD_SUCCESS,
  TOKENS_DATA_OFFERS_LOAD,
  TOKENS_DATA_OFFERS_LOAD_SUCCESS,
  TOKENS_DATA_UPDATE,
  TOKENS_DATA_LAST_ACHIEVEMENT_LOAD,
  TOKENS_DATA_LAST_ACHIEVEMENT_LOAD_SUCCESS,
  TOKENS_DATA_REWARD_LOAD,
} from './tokens.data.actions';

export const initialState = {
  earnedAchievements: {
    results: [],
    count: 0,
    next: 0,
    previous: null,
    loading: false,
  },
  recommendedGames: {
    results: [],
    count: 0,
    next: 0,
    previous: null,
    loading: false,
  },
  leaderboard: {
    first: {
      results: [],
      count: 0,
      next: 0,
      previous: null,
      loading: false,
    },
    user: {
      results: [],
      count: 0,
      next: 0,
      previous: null,
      loading: false,
    },
    offers: {
      results: [],
      count: 0,
      next: 0,
      previous: null,
      loading: false,
    },
  },
  lastAchievement: {
    id: 0,
    user: {
      id: 0,
      username: '',
      slug: '',
      full_name: '',
      avatar: '',
      games_count: 0,
      collections_count: 0,
      followers_count: 0,
    },
    achieved: '',
    name: '',
    description: '',
    karma: 0,
    loading: false,
  },
  reward: {
    yout_top: 0,
    tokens: 0,
    users: 0,
    exchange_until: '',
    your_karma: 0,
    your_tokens: 0,
  },
};

export default function showcase(state = initialState, action) {
  switch (action.type) {
    case TOKENS_DATA_UPDATE:
      return {
        ...state,
        ...action.data,
      };

    case TOKENS_DATA_EARNED_ACHIEVEMENTS_LOAD:
      return {
        ...state,
        earnedAchievements: {
          ...state.earnedAchievements,
          results: action.data.page === 1 ? [] : state.earnedAchievements.results,
          loading: true,
        },
      };

    case TOKENS_DATA_EARNED_ACHIEVEMENTS_LOAD_SUCCESS:
      return {
        ...state,
        earnedAchievements: {
          ...state.earnedAchievements,
          ...action.data,
          results: action.push
            ? [...state.earnedAchievements.results, ...action.data.results]
            : [...action.data.results],
          loading: false,
        },
      };

    case TOKENS_DATA_RECOMMENDED_GAMES_LOAD:
      return {
        ...state,
        recommendedGames: {
          ...state.recommendedGames,
          results: action.data.page === 1 ? [] : state.recommendedGames.results,
          loading: true,
        },
      };

    case TOKENS_DATA_RECOMMENDED_GAMES_LOAD_SUCCESS:
      return {
        ...state,
        recommendedGames: {
          ...state.recommendedGames,
          ...action.data,
          results: action.push ? [...state.recommendedGames.results, ...action.data.results] : [...action.data.results],
          loading: false,
        },
      };

    case TOKENS_DATA_LEADERBOARD_FIRST_LOAD:
      return {
        ...state,
        leaderboard: {
          ...state.leaderboard,
          first: {
            ...state.leaderboard.first,
            results: action.data.page === 1 ? [] : state.leaderboard.first.results,
            loading: true,
          },
        },
      };

    case TOKENS_DATA_LEADERBOARD_FIRST_LOAD_SUCCESS:
      return {
        ...state,
        leaderboard: {
          ...state.leaderboard,
          first: {
            ...state.leaderboard.first,
            ...action.data,
            results: action.push
              ? [...state.leaderboard.first.results, ...action.data.results]
              : [...action.data.results],
            loading: false,
          },
        },
      };

    case TOKENS_DATA_LEADERBOARD_USER_LOAD:
      return {
        ...state,
        leaderboard: {
          ...state.leaderboard,
          user: {
            ...state.leaderboard.user,
            results: action.data.page === 1 ? [] : state.leaderboard.user.results,
            loading: true,
          },
        },
      };

    case TOKENS_DATA_LEADERBOARD_USER_LOAD_SUCCESS:
      return {
        ...state,
        leaderboard: {
          ...state.leaderboard,
          user: {
            ...state.leaderboard.user,
            ...action.data,
            results: action.push
              ? [...state.leaderboard.user.results, ...action.data.results]
              : [...action.data.results],
            loading: false,
          },
        },
      };

    case TOKENS_DATA_REWARD_LOAD:
      return {
        ...state,
        reward: action.data,
      };

    case TOKENS_DATA_OFFERS_LOAD:
      return {
        ...state,
        offers: {
          ...state.offers,
          results: action.data.page === 1 ? [] : state.offers.results,
          loading: true,
        },
      };

    case TOKENS_DATA_OFFERS_LOAD_SUCCESS:
      return {
        ...state,
        offers: {
          ...state.offers,
          ...action.data,
          results: action.push ? [...state.offers.results, ...action.data.results] : [...action.data.results],
          loading: false,
        },
      };

    case TOKENS_DATA_LAST_ACHIEVEMENT_LOAD:
      return {
        ...state,
        lastAchievement: {
          ...state.lastAchievement,
          loading: true,
        },
      };

    case TOKENS_DATA_LAST_ACHIEVEMENT_LOAD_SUCCESS:
      return {
        ...state,
        lastAchievement: {
          ...state.lastAchievement,
          ...action.data,
          loading: false,
        },
      };

    default:
      return state;
  }
}
