import last from 'lodash/last';
import paths from 'config/paths';
import { setStatus, return404IfEmptyPage, setResponseHeader } from 'app/pages/app/app.actions';
import { needLoadingGame, needLoadSubpageData } from 'app/pages/game/game.helper';
import Error404 from 'interfaces/error-404';
import env from 'config/env';
import denormalizeGame from 'tools/redux/denormalize-game';

import { reviewsCount } from 'app/pages/game/game/reviews';

import {
  loadGame,
  loadGameAdfox,
  loadGameScreenshots,
  loadGameMovies,
  loadGameCollections,
  loadGameSuggestions,
  loadGameReviews,
  loadGamePosts,
  loadGameOwners,
  loadGameYoutube,
  loadGameCreators,
  loadGameImgur,
  loadGameAchievements,
  loadGameReddit,
  loadGameTwitch,
  resetGameState,
  loadGamePatches,
  loadGameDemos,
  loadGameCheats,
  loadGameCheat,
  loadGameReview,
  loadGamePatch,
  loadGameDemo,
  loadGameAdditions,
  loadGameSeries,
  loadGameParents,
  loadGameContributors,
} from './game.actions';

const emptyAvailableSubpages = ['reviews', 'posts'];

export const prepareGameFn = ({ store, params: { id }, location }) => {
  if (location) {
    const { pathname } = location;
    const subroutes = pathname.split('/');

    let routeId = subroutes[subroutes.length - 1];
    if (routeId === 'full') {
      routeId = subroutes[subroutes.length - 2];
    }

    if (routeId !== id) {
      store.dispatch(setStatus(404));

      if (env.isServer()) {
        throw new Error404();
      }
    }
  }

  store.dispatch(resetGameState());

  // Игру загружаем отдельно по той причине,
  // что там может вернуться ответ-редирект,
  // который надо будет обработать.
  // Подробнее: https://3.basecamp.com/3964781/buckets/8674725/todos/1234690684
  return store.dispatch(loadGame(id, paths.game)).then(async (loadedNormally) => {
    if (!loadedNormally) {
      return undefined;
    }

    const state = store.getState();
    const gameData = denormalizeGame(state);

    if (gameData.updated) {
      const updatedDate = new Date(gameData.updated);

      store.dispatch(setResponseHeader('Last-Modified', updatedDate.toUTCString()));
    }

    await Promise.all([
      gameData.editorial_review && store.dispatch(loadGameReview(id)),
      store.dispatch(loadGameAdfox(gameData.id)),
      store.dispatch(loadGameScreenshots({ id })),
      store.dispatch(loadGameMovies(id)),
      store.dispatch(loadGameCollections(id)),
      store.dispatch(loadGameSuggestions(id, 1, 9, !!(gameData.iframe_url || gameData.can_play))),
      store.dispatch(loadGameReviews(id, 1, {}, reviewsCount)),
      store.dispatch(loadGamePosts(id, 1)),
      store.dispatch(loadGameOwners(id)),
      store.dispatch(loadGameYoutube(id, 1)),
      store.dispatch(loadGameCreators(id, 1, 9)),
      store.dispatch(loadGameImgur(id, 1)),
      store.dispatch(loadGameAchievements(id, 1)),
      store.dispatch(loadGameReddit(id, 1)),
      store.dispatch(loadGameTwitch(id, 1)),
      store.dispatch(loadGameAdditions(id, 1)),
      store.dispatch(loadGameSeries(id, 1)),
      store.dispatch(loadGameParents(id, 1)),
      store.dispatch(loadGameContributors(id, 1)),
    ]);

    return undefined;
  });
};

async function loadSubpageData({ store, params, redirectPath, load, key, needLoadChecker, location }) {
  const { id } = params;
  const state = store.getState();
  const { page = 1 } = location.query;
  const isThrowingError = !emptyAvailableSubpages.includes(key);
  const gameData = denormalizeGame(state);

  const loadData = () => load(id, page, params).then(return404IfEmptyPage(store.dispatch, { isThrowingError }));

  if (needLoadingGame(gameData.slug, id)) {
    const loadedNormally = await store.dispatch(loadGame(id, redirectPath));

    if (loadedNormally) {
      await loadData();
    }
  } else if (
    (needLoadChecker && needLoadChecker(gameData[key])) ||
    (!needLoadChecker && needLoadSubpageData(gameData[key]))
  ) {
    await loadData();
  }
}

export async function prepareAchievements({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gameAchievements,
    load: (id, page) => Promise.all([store.dispatch(loadGameAchievements(id, page))]),
    key: 'achievements',
  });
}

export async function prepareCollections({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gameCollections,
    load: (id, page) => Promise.all([store.dispatch(loadGameCollections(id, page))]),
    key: 'collections',
  });
}

export async function prepareImgur({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gameImgur,
    load: (id, page) => Promise.all([store.dispatch(loadGameImgur(id, page))]),
    key: 'imgur',
  });
}

export async function preparePosts({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gamePosts,
    load: (id, page) => Promise.all([store.dispatch(loadGamePosts(id, page))]),
    key: 'posts',
  });
}

export async function prepareReddit({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gameReddit,
    load: (id, page) => Promise.all([store.dispatch(loadGameReddit(id, page))]),
    key: 'reddit',
  });
}

export async function prepareReviews({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gameReviews,
    load: (id, page) => Promise.all([store.dispatch(loadGameReviews(id, page))]),
    key: 'reviews',
  });
}

export async function prepareScreenshots({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gameScreenshots,
    load: (id, page) =>
      Promise.all([store.dispatch(loadGameScreenshots({ id, page })), store.dispatch(loadGameMovies(id))]),
    key: 'screenshots',
  });
}

export async function prepareSuggestions({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gameSuggestions,
    load: (id, page) => Promise.all([store.dispatch(loadGameSuggestions(id, page))]),
    key: 'suggestions',
  });
}

export async function prepareTeam({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gameTeam,
    load: (id, page) => Promise.all([store.dispatch(loadGameCreators(id, page))]),
    key: 'persons',
  });
}

export async function prepareTwitch({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gameTwitch,
    load: (id, page) => Promise.all([store.dispatch(loadGameTwitch(id, page))]),
    key: 'twitch',
  });
}

export async function prepareYoutube({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gameYoutube,
    load: (id, page) => Promise.all([store.dispatch(loadGameYoutube(id, page))]),
    key: 'youtube',
  });
}

// Разделы для AG-версии сайта

export async function preparePatches({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gamePatches,
    load: (id, page) => Promise.all([store.dispatch(loadGamePatches(id, page))]),
    key: 'patches',
  });
}

export async function preparePatch({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gamePatch,
    load: () => Promise.all([store.dispatch(loadGamePatch(params.patchId))]),
    key: 'patch',
    needLoadChecker: () => true,
  });
}

export async function prepareDemos({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gameDemos,
    load: (id, page) => Promise.all([store.dispatch(loadGameDemos(id, page))]),
    key: 'demos',
  });
}

export async function prepareDemo({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gameDemo,
    load: () => Promise.all([store.dispatch(loadGameDemo(params.demoId))]),
    key: 'demo',
    needLoadChecker: () => true,
  });
}

export async function prepareCheats({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gameCheats,
    load: (id, page) => Promise.all([store.dispatch(loadGameCheats(id, page))]),
    key: 'cheats',
  });
}

export async function prepareCheat({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gameCheat,
    load: () => Promise.all([store.dispatch(loadGameCheat(params.cheatId))]),
    key: 'cheat',
    needLoadChecker: () => true,
  });
}

export async function prepareReview({ store, location, params = {} }) {
  await loadSubpageData({
    store,
    params,
    location,
    redirectPath: paths.gameReview,
    needLoadChecker: (review) => !review.text,
    load: (id) =>
      Promise.all([
        store.dispatch(loadGameReview(id)),
        store.dispatch(loadGameReviews(id)),
        store.dispatch(loadGameScreenshots({ id })),
      ]),
    key: 'review',
  });
}
