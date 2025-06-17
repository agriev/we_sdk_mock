import createReducer from 'tools/redux/create-reducer';

import find from 'lodash/find';
import get from 'lodash/get';
import isPlainObject from 'lodash/isPlainObject';

import concat from 'ramda/src/concat';
import head from 'ramda/src/head';
import prop from 'ramda/src/prop';
import sortBy from 'ramda/src/sortBy';
import pipe from 'ramda/src/pipe';
import reverse from 'ramda/src/reverse';
import init from 'ramda/src/init';
import when from 'ramda/src/when';
import ifElse from 'ramda/src/ifElse';
import prepend from 'ramda/src/prepend';
import append from 'ramda/src/append';
import modulo from 'ramda/src/modulo';
import length from 'ramda/src/length';
import equals from 'ramda/src/equals';
import both from 'ramda/src/both';
import divide from 'ramda/src/divide';
import inc from 'ramda/src/inc';
import gt from 'ramda/src/gt';
import __ from 'ramda/src/__';
import filter from 'ramda/src/filter';
import evolve from 'ramda/src/evolve';
import map from 'ramda/src/map';
import always from 'ramda/src/always';
import assoc from 'ramda/src/assoc';
import T from 'ramda/src/T';
import F from 'ramda/src/F';

import adjustByProp from 'tools/ramda/adjust-by-property';

import compactObject from 'tools/compact-object';
import notEquals from 'tools/ramda/not-equals';

import {
  GAME_STATUS_BEATEN,
  GAME_STATUS_PLAYING,
  GAME_STATUS_TOPLAY,
  GAME_STATUS_OWNED,
  GAME_STATUS_DROPPED,
  GAME_STATUS_YET,
} from 'app/pages/game/game.types';

import { GAME_USER_REVIEW_UPDATED, GAME_STATUS_UPDATED } from 'redux-logic/reducers/games';

import {
  GAME_USER_COLLECTION_REMOVED,
  GAME_USER_COLLECTION_ADDED,
  GAME_USER_COLLECTIONS_LOADED,
  GAME_USER_COLLECTIONS_LOADING,
} from 'app/pages/game/game.actions';

import {
  PROFILE_GAME_STATUS_CHANGED,
  PROFILE_GAMES_STATUSES_LOAD,
  PROFILE_GAMES_STATUSES_LOAD_SUCCESS,
  PROFILE_GAMES_PLATFORMS_REPLACE,
  gamesOnPage,
} from '../profile.actions';

const initialState = {
  counters: {},
  owned: {
    count: 0,
    next: 1,
    results: [],
    loading: true,
  },
  toplay: {
    count: 0,
    next: 1,
    results: [],
    loading: true,
  },
  playing: {
    count: 0,
    next: 1,
    results: [],
    loading: true,
  },
  beaten: {
    count: 0,
    next: 1,
    results: [],
    loading: true,
  },
  dropped: {
    count: 0,
    next: 1,
    results: [],
    loading: true,
  },
  yet: {
    count: 0,
    next: 1,
    results: [],
    loading: true,
  },
};

const profileGamesReducer = createReducer(initialState, {
  [PROFILE_GAMES_STATUSES_LOAD]: (state, data) => ({
    ...state,
    [data.status]: {
      ...state[data.status],
      // results: data.page === 1 ? [] : state[data.status].results,
      loading: true,
    },
  }),

  [PROFILE_GAMES_STATUSES_LOAD_SUCCESS]: (state, data, action) => ({
    ...state,
    counters: data.counters,
    [data.status]: {
      ...data,
      results: action.push ? [...state[data.status].results, ...data.results] : [...data.results],
      loading: false,
    },
  }),

  [PROFILE_GAMES_PLATFORMS_REPLACE]: (state, data) => {
    const gameIncludesId = (game) => data.gameIds.includes(game.id);
    const platforms = data.platforms.map((ptfm) => ({ ...ptfm, name: ptfm.value }));
    const updatePlatformsByStatus = evolve({
      results: map(
        when(
          gameIncludesId,
          evolve({
            user_game: {
              platfoms: always(platforms),
            },
          }),
        ),
      ),
    });

    return {
      ...state,
      [GAME_STATUS_OWNED]: updatePlatformsByStatus(state[GAME_STATUS_OWNED]),
      [GAME_STATUS_TOPLAY]: updatePlatformsByStatus(state[GAME_STATUS_TOPLAY]),
      [GAME_STATUS_PLAYING]: updatePlatformsByStatus(state[GAME_STATUS_PLAYING]),
      [GAME_STATUS_BEATEN]: updatePlatformsByStatus(state[GAME_STATUS_BEATEN]),
      [GAME_STATUS_DROPPED]: updatePlatformsByStatus(state[GAME_STATUS_DROPPED]),
      [GAME_STATUS_YET]: updatePlatformsByStatus(state[GAME_STATUS_YET]),
    };
  },

  [PROFILE_GAME_STATUS_CHANGED]: (state, data) => {
    const { newStatus, oldStatus, filter: filterQuery, game: gameFromData, newGame } = data;

    const game = find(get(state, `${oldStatus}.results`, []), {
      id: gameFromData.id,
    });

    const ordering = head(filterQuery.ordering);

    if (!game) {
      return state;
    }

    if (game.user_game) {
      game.user_game.status = newStatus;
    }

    const addOnNewPage = both(
      pipe(
        length,
        notEquals(1),
      ),
      pipe(
        length,
        modulo(gamesOnPage + 1),
        equals(0),
      ),
    );

    const updateGamesByStatus = (status) => {
      const games = state[status];
      const gamesWithGame = concat(games.results, [game]);
      const initIfNeed = when(addOnNewPage, init);
      const newCount = games.count + 1;
      const oldCount = games.count - 1;
      const newGameIsPresent = () => isPlainObject(newGame);

      const resortWithReverse = (method) =>
        pipe(
          sortBy(method),
          reverse,
          initIfNeed,
        );

      const resort = (method) =>
        pipe(
          sortBy(method),
          initIfNeed,
        );

      const prependAndInit = pipe(
        prepend(game),
        initIfNeed,
      );

      const calcMaxPage = (cnt) => Math.ceil(divide(cnt, gamesOnPage));
      const checkOnMaxPage = (cnt) => ifElse(gt(calcMaxPage(cnt)), inc, () => null);
      const calcNextPage = (cnt) =>
        pipe(
          divide(__, gamesOnPage),
          Math.ceil,
          checkOnMaxPage(cnt),
        );

      const gamesListGenerators = {
        '-created': () => prependAndInit(games.results),
        '-released': resortWithReverse((gm) => new Date(gm.released)),
        '-added': resortWithReverse(prop('added')),
        '-usergame__rating': resortWithReverse(prop('rating_top')),
        name: resort(prop('name')),
      };

      if (status === newStatus) {
        const results = gamesListGenerators[ordering](gamesWithGame);
        return {
          ...games,
          results,
          next: calcNextPage(newCount)(results.length),
          count: newCount,
        };
      }

      if (status === oldStatus) {
        const calcOldgames = pipe(
          filter(
            pipe(
              prop('id'),
              notEquals(game.id),
            ),
          ),
          when(newGameIsPresent, append(newGame)),
        );
        const results = calcOldgames(games.results);
        return {
          ...games,
          results,
          next: calcNextPage(oldCount)(results.length),
          count: oldCount,
        };
      }

      return games;
    };

    return {
      counters: compactObject({
        ...state.counters,
        [newStatus]: state.counters[newStatus] + 1,
        [oldStatus]: state.counters[oldStatus] - 1,
      }),
      [GAME_STATUS_OWNED]: updateGamesByStatus(GAME_STATUS_OWNED),
      [GAME_STATUS_TOPLAY]: updateGamesByStatus(GAME_STATUS_TOPLAY),
      [GAME_STATUS_PLAYING]: updateGamesByStatus(GAME_STATUS_PLAYING),
      [GAME_STATUS_BEATEN]: updateGamesByStatus(GAME_STATUS_BEATEN),
      [GAME_STATUS_DROPPED]: updateGamesByStatus(GAME_STATUS_DROPPED),
      [GAME_STATUS_YET]: updateGamesByStatus(GAME_STATUS_YET),
    };
  },

  [GAME_STATUS_UPDATED]: (state, { gameSlug, added, addedByStatus, userGame }) => {
    const updateGamesByStatus = evolve({
      results: adjustByProp(
        'slug',
        gameSlug,
        evolve({
          added: always(added),
          added_by_status: always(addedByStatus),
          user_game: userGame
            ? (object) => ({
                ...object,
                ...userGame,
              })
            : always(null),
        }),
      ),
    });

    return {
      ...state,
      [GAME_STATUS_OWNED]: updateGamesByStatus(state[GAME_STATUS_OWNED]),
      [GAME_STATUS_TOPLAY]: updateGamesByStatus(state[GAME_STATUS_TOPLAY]),
      [GAME_STATUS_PLAYING]: updateGamesByStatus(state[GAME_STATUS_PLAYING]),
      [GAME_STATUS_BEATEN]: updateGamesByStatus(state[GAME_STATUS_BEATEN]),
      [GAME_STATUS_DROPPED]: updateGamesByStatus(state[GAME_STATUS_DROPPED]),
      [GAME_STATUS_YET]: updateGamesByStatus(state[GAME_STATUS_YET]),
    };
  },

  [GAME_USER_REVIEW_UPDATED]: (state, { review, gameSlug }) => {
    const updateGamesByStatus = evolve({
      results: adjustByProp('slug', gameSlug, assoc('user_review', review)),
    });

    return {
      ...state,
      [GAME_STATUS_OWNED]: updateGamesByStatus(state[GAME_STATUS_OWNED]),
      [GAME_STATUS_TOPLAY]: updateGamesByStatus(state[GAME_STATUS_TOPLAY]),
      [GAME_STATUS_PLAYING]: updateGamesByStatus(state[GAME_STATUS_PLAYING]),
      [GAME_STATUS_BEATEN]: updateGamesByStatus(state[GAME_STATUS_BEATEN]),
      [GAME_STATUS_DROPPED]: updateGamesByStatus(state[GAME_STATUS_DROPPED]),
      [GAME_STATUS_YET]: updateGamesByStatus(state[GAME_STATUS_YET]),
    };
  },

  [GAME_USER_COLLECTIONS_LOADING]: (state, { gameSlug }) => {
    const updateGamesByStatus = evolve({
      results: adjustByProp('slug', gameSlug, assoc('user_collections', [])),
    });

    return {
      ...state,
      [GAME_STATUS_OWNED]: updateGamesByStatus(state[GAME_STATUS_OWNED]),
      [GAME_STATUS_TOPLAY]: updateGamesByStatus(state[GAME_STATUS_TOPLAY]),
      [GAME_STATUS_PLAYING]: updateGamesByStatus(state[GAME_STATUS_PLAYING]),
      [GAME_STATUS_BEATEN]: updateGamesByStatus(state[GAME_STATUS_BEATEN]),
      [GAME_STATUS_DROPPED]: updateGamesByStatus(state[GAME_STATUS_DROPPED]),
      [GAME_STATUS_YET]: updateGamesByStatus(state[GAME_STATUS_YET]),
    };
  },

  [GAME_USER_COLLECTIONS_LOADED]: (state, { gameSlug, collections }) => {
    const updateGamesByStatus = evolve({
      results: adjustByProp('slug', gameSlug, assoc('user_collections', collections)),
    });

    return {
      ...state,
      [GAME_STATUS_OWNED]: updateGamesByStatus(state[GAME_STATUS_OWNED]),
      [GAME_STATUS_TOPLAY]: updateGamesByStatus(state[GAME_STATUS_TOPLAY]),
      [GAME_STATUS_PLAYING]: updateGamesByStatus(state[GAME_STATUS_PLAYING]),
      [GAME_STATUS_BEATEN]: updateGamesByStatus(state[GAME_STATUS_BEATEN]),
      [GAME_STATUS_DROPPED]: updateGamesByStatus(state[GAME_STATUS_DROPPED]),
      [GAME_STATUS_YET]: updateGamesByStatus(state[GAME_STATUS_YET]),
    };
  },

  [GAME_USER_COLLECTION_ADDED]: (state, { collectionId, gameSlug }) => {
    const updatedCollectionFlag = adjustByProp(
      'id',
      collectionId,
      evolve({
        game_in_collection: T,
      }),
    );

    const updateGamesByStatus = evolve({
      results: adjustByProp('slug', gameSlug, updatedCollectionFlag),
    });

    return {
      ...state,
      [GAME_STATUS_OWNED]: updateGamesByStatus(state[GAME_STATUS_OWNED]),
      [GAME_STATUS_TOPLAY]: updateGamesByStatus(state[GAME_STATUS_TOPLAY]),
      [GAME_STATUS_PLAYING]: updateGamesByStatus(state[GAME_STATUS_PLAYING]),
      [GAME_STATUS_BEATEN]: updateGamesByStatus(state[GAME_STATUS_BEATEN]),
      [GAME_STATUS_DROPPED]: updateGamesByStatus(state[GAME_STATUS_DROPPED]),
      [GAME_STATUS_YET]: updateGamesByStatus(state[GAME_STATUS_YET]),
    };
  },

  [GAME_USER_COLLECTION_REMOVED]: (state, { collectionId, gameSlug }) => {
    const updatedCollectionFlag = adjustByProp(
      'id',
      collectionId,
      evolve({
        game_in_collection: F,
      }),
    );

    // eslint-disable-next-line sonarjs/no-identical-functions
    const updateGamesByStatus = evolve({
      results: adjustByProp('slug', gameSlug, updatedCollectionFlag),
    });

    return {
      ...state,
      [GAME_STATUS_OWNED]: updateGamesByStatus(state[GAME_STATUS_OWNED]),
      [GAME_STATUS_TOPLAY]: updateGamesByStatus(state[GAME_STATUS_TOPLAY]),
      [GAME_STATUS_PLAYING]: updateGamesByStatus(state[GAME_STATUS_PLAYING]),
      [GAME_STATUS_BEATEN]: updateGamesByStatus(state[GAME_STATUS_BEATEN]),
      [GAME_STATUS_DROPPED]: updateGamesByStatus(state[GAME_STATUS_DROPPED]),
      [GAME_STATUS_YET]: updateGamesByStatus(state[GAME_STATUS_YET]),
    };
  },
});

export default profileGamesReducer;
