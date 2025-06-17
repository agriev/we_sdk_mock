import urlParse from 'url-parse';

import fetch from 'tools/fetch';

export const TOKENS_DATA_UPDATE = 'TOKENS_DATA_UPDATE';
export const TOKENS_DATA_EARNED_ACHIEVEMENTS_LOAD = 'TOKENS_DATA_EARNED_ACHIEVEMENTS_LOAD';
export const TOKENS_DATA_EARNED_ACHIEVEMENTS_LOAD_SUCCESS = 'TOKENS_DATA_EARNED_ACHIEVEMENTS_LOAD_SUCCESS';
export const TOKENS_DATA_RECOMMENDED_GAMES_LOAD = 'TOKENS_DATA_RECOMMENDED_GAMES_LOAD';
export const TOKENS_DATA_RECOMMENDED_GAMES_LOAD_SUCCESS = 'TOKENS_DATA_RECOMMENDED_GAMES_LOAD_SUCCESS';
export const TOKENS_DATA_LEADERBOARD_FIRST_LOAD = 'TOKENS_DATA_LEADERBOARD_FIRST_LOAD';
export const TOKENS_DATA_LEADERBOARD_FIRST_LOAD_SUCCESS = 'TOKENS_DATA_LEADERBOARD_FIRST_LOAD_SUCCESS';
export const TOKENS_DATA_LEADERBOARD_USER_LOAD = 'TOKENS_DATA_LEADERBOARD_USER_LOAD';
export const TOKENS_DATA_LEADERBOARD_USER_LOAD_SUCCESS = 'TOKENS_DATA_LEADERBOARD_USER_LOAD_SUCCESS';
export const TOKENS_DATA_OFFERS_LOAD = 'TOKENS_DATA_OFFERS_LOAD';
export const TOKENS_DATA_OFFERS_LOAD_SUCCESS = 'TOKENS_DATA_OFFERS_LOAD_SUCCESS';
export const TOKENS_DATA_REWARD_LOAD = 'TOKENS_DATA_REWARD_LOAD';
export const TOKENS_DATA_LAST_ACHIEVEMENT_LOAD = 'TOKENS_DATA_LAST_ACHIEVEMENT_LOAD';
export const TOKENS_DATA_LAST_ACHIEVEMENT_LOAD_SUCCESS = 'TOKENS_DATA_LAST_ACHIEVEMENT_LOAD_SUCCESS';

export function loadEarnedAchievements(page = 1) {
  return async (dispatch, getState) => {
    const state = getState();

    if (!state.currentUser.id) {
      return undefined;
    }

    dispatch({
      type: TOKENS_DATA_EARNED_ACHIEVEMENTS_LOAD,
      data: { page },
    });

    const uri = '/api/token/achievements?page_size=7';

    return fetch(uri, {
      method: 'get',
      data: { page },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      dispatch({
        type: TOKENS_DATA_EARNED_ACHIEVEMENTS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadRecommendedGames(page = 1) {
  return async (dispatch, getState) => {
    const state = getState();

    if (!state.currentUser.id) {
      return undefined;
    }

    dispatch({
      type: TOKENS_DATA_RECOMMENDED_GAMES_LOAD,
      data: { page },
    });

    const uri = '/api/token/games?page_size=2';

    return fetch(uri, {
      method: 'get',
      data: { page },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      dispatch({
        type: TOKENS_DATA_RECOMMENDED_GAMES_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadLeaderboardFirst(page = 1) {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({
      type: TOKENS_DATA_LEADERBOARD_FIRST_LOAD,
      data: { page },
    });

    const uri = '/api/token/players?page_size=3';

    return fetch(uri, {
      method: 'get',
      data: { page },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      dispatch({
        type: TOKENS_DATA_LEADERBOARD_FIRST_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadLeaderboardUser(page = 1) {
  return async (dispatch, getState) => {
    const state = getState();

    if (!state.currentUser.id) {
      return undefined;
    }

    dispatch({
      type: TOKENS_DATA_LEADERBOARD_USER_LOAD,
      data: { page },
    });

    const uri = '/api/token/players?page_size=6&from_current=true';

    return fetch(uri, {
      method: 'get',
      data: { page },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      dispatch({
        type: TOKENS_DATA_LEADERBOARD_USER_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadReward() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/token/reward';

    return fetch(uri, {
      method: 'get',
      state,
    }).then((data) => {
      dispatch({ type: TOKENS_DATA_REWARD_LOAD, data });
    });
  };
}

export function loadOffers(page = 1) {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({
      type: TOKENS_DATA_OFFERS_LOAD,
      data: { page },
    });

    const uri = '/api/shop/products?page_size=8';

    return fetch(uri, {
      method: 'get',
      data: { page },
      state,
    }).then((res) => {
      const url = res.next && urlParse(res.next, true);

      dispatch({
        type: TOKENS_DATA_OFFERS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
        },
        push: page > 1,
      });
    });
  };
}

export function loadLastAchievement() {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({ type: TOKENS_DATA_LAST_ACHIEVEMENT_LOAD });

    const uri = '/api/token/last-achievement';

    return fetch(uri, {
      method: 'get',
      state,
    }).then((data) => {
      dispatch({
        type: TOKENS_DATA_LAST_ACHIEVEMENT_LOAD_SUCCESS,
        data,
      });
    });
  };
}

export const updateDashboardData = (data) => ({
  type: TOKENS_DATA_UPDATE,
  data,
});
