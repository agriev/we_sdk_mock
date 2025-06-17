/* eslint-disable sonarjs/cognitive-complexity, no-mixed-operators */
import urlParse from 'url-parse';
import {
  GAME_EDIT_UPLOAD_SCREENSHOT_SUCCESS,
  GAME_EDIT_REMOVE_SCREENSHOT_SUCCESS,
  GAME_EDIT_REPLACE_SCREENSHOT_SUCCESS,
} from 'app/pages/game-edit/actions/screenshots';

import createReducer from 'tools/redux/create-reducer';

import T from 'ramda/src/T';
import F from 'ramda/src/F';
import always from 'ramda/src/always';
import evolve from 'ramda/src/evolve';
import inc from 'ramda/src/inc';
import dec from 'ramda/src/dec';
import prepend from 'ramda/src/prepend';
import mapObjIndexed from 'ramda/src/mapObjIndexed';
import pipe from 'ramda/src/pipe';
import when from 'ramda/src/when';
import both from 'ramda/src/both';
import mergeRight from 'ramda/src/mergeRight';
import map from 'ramda/src/map';
import pathEq from 'ramda/src/pathEq';
import assocPath from 'ramda/src/assocPath';

import adjustByProp from 'tools/ramda/adjust-by-property';

import {
  ACTIVITY_FOLLOW_UNFOLLOW_USER,
  ACTIVITY_UNFOLLOW_USER_SUCCESS,
  ACTIVITY_FOLLOW_USER_SUCCESS,
} from 'app/pages/activity/activity.actions';

import {
  GAME_RESET_STATE,
  GAME_LOAD,
  GAME_LOAD_SUCCESS,
  GAME_SCREENSHOTS_LOAD,
  GAME_SCREENSHOTS_LOAD_SUCCESS,
  GAME_SCREENSHOT_LOAD,
  GAME_SCREENSHOT_LOAD_SUCCESS,
  GAME_SCREENSHOT_LOAD_FAILED,
  GAME_MOVIES_LOAD,
  GAME_MOVIES_LOAD_SUCCESS,
  GAME_COLLECTIONS_LOAD,
  GAME_COLLECTIONS_LOAD_SUCCESS,
  GAME_SUGGESTIONS_LOAD,
  GAME_SUGGESTIONS_LOAD_SUCCESS,
  GAME_REVIEWS_LOAD,
  GAME_REVIEWS_LOAD_SUCCESS,
  GAME_REVIEWS_UPDATE_SUCCESS,
  GAME_POSTS_LOAD,
  GAME_POSTS_LOAD_SUCCESS,
  GAME_POSTS_UPDATE_SUCCESS,
  GAME_OWNERS_LOAD,
  GAME_OWNERS_LOAD_SUCCESS,
  GAME_YOUTUBE_LOAD,
  GAME_YOUTUBE_LOAD_SUCCESS,
  GAME_PERSONS_LOAD,
  GAME_PERSONS_LOAD_SUCCESS,
  GAME_PERSON_GAMES_LOAD_NEXT,
  GAME_IMGUR_LOAD,
  GAME_IMGUR_LOAD_SUCCESS,
  GAME_ACHIEVEMENTS_LOAD,
  GAME_ACHIEVEMENTS_LOAD_SUCCESS,
  GAME_REDDIT_LOAD,
  GAME_REDDIT_LOAD_SUCCESS,
  GAME_TWITCH_LOAD,
  GAME_TWITCH_LOAD_SUCCESS,
  GAME_USER_COLLECTION_ADDED,
  GAME_USER_COLLECTIONS_LOADING,
  GAME_USER_COLLECTIONS_LOADED,
  GAME_USER_COLLECTION_REMOVED,
  GAME_PATCHES_LOAD_SUCCESS,
  GAME_PATCHES_LOAD,
  GAME_DEMOS_LOAD,
  GAME_DEMOS_LOAD_SUCCESS,
  GAME_CHEATS_LOAD,
  GAME_CHEATS_LOAD_SUCCESS,
  GAME_CHEAT_LOAD,
  GAME_CHEAT_LOAD_SUCCESS,
  GAME_REVIEW_LOAD,
  GAME_REVIEW_LOAD_SUCCESS,
  GAME_PATCH_LOAD,
  GAME_PATCH_LOAD_SUCCESS,
  GAME_DEMO_LOAD,
  GAME_DEMO_LOAD_SUCCESS,
  GAME_ADDITIONS_LOAD,
  GAME_ADDITIONS_LOAD_SUCCESS,
  GAME_SERIES_LOAD_SUCCESS,
  GAME_SERIES_LOAD,
  GAME_PARENTS_LOAD,
  GAME_PARENTS_LOAD_SUCCESS,
  GAME_CONTRIBUTORS,
  GAME_ADFOX_LOAD,
  GAME_ADFOX_LOAD_SUCCESS,
} from './game.actions';

export const initialState = {
  loading: false,
  slug: '',
  user_collections: [],
  screenshots: {
    count: 0,
    results: [],
    loading: false,
  },
  screenshot: {
    id: undefined,
    image: '',
    seo_title: '',
    seo_description: '',
    seo_h1: '',
  },
  movies: {
    count: 0,
    results: [],
    loading: false,
  },
  collections: {
    count: 0,
    results: [],
    loading: false,
  },
  suggestions: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
  },
  reviews: {
    count: 0,
    next: 1,
    results: [],
    popular: {
      count: 0,
      results: [],
    },
    your: null,
    loading: false,
  },
  posts: {
    count: 0,
    next: 1,
    results: [],
    popular: {
      count: 0,
      results: [],
    },
    your: null,
    loading: false,
  },
  owners: {
    friends: false,
    users: [],
    count: 0,
    loading: false,
  },
  youtube: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
  },
  persons: {
    results: [],
    next: 1,
    loading: false,
  },
  imgur: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
  },
  achievements: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
  },
  reddit: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
  },
  twitch: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
  },
  additions: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
  },
  gameSeries: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
  },
  parents: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
  },
  patches: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
  },
  demos: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
  },
  cheats: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
  },
  contributors: {
    count: 0,
    next: 1,
    results: [],
    loading: false,
  },
  cheat: {
    loading: false,
  },
  patch: {
    loading: false,
  },
  demo: {
    loading: false,
  },
  review: {
    loading: false,
  },
  adfox: {
    count: 0,
    loading: false,
    next: null,
    results: [],
  },
};

const gameEdit = createReducer(initialState, {
  [GAME_RESET_STATE]: always(initialState),

  [GAME_ADFOX_LOAD]: (state) => ({
    ...state,
    adfox: {
      loading: true,
    },
  }),

  [GAME_ADFOX_LOAD_SUCCESS]: (state, data) => ({
    ...state,
    adfox: {
      ...data,
      loading: false,
    },
  }),

  [GAME_LOAD]: (state) => ({
    ...state,
    suggestions: initialState.suggestions,
    collections: initialState.collections,
    reviews: initialState.reviews,
    posts: initialState.posts,
    owners: initialState.owners,
    loading: true,
  }),

  [GAME_LOAD_SUCCESS]: (state, data) => ({
    ...state,
    slug: data.results.result,
    loading: false,
  }),

  [GAME_SCREENSHOTS_LOAD]: (state) => ({
    ...state,
    screenshots: {
      ...state.screenshots,
      loading: true,
    },
  }),

  [GAME_SCREENSHOT_LOAD]: (state) => ({
    ...state,
    screenshot: {
      ...state.screenshot,
      image: '',
      loading: true,
    },
  }),

  [GAME_SCREENSHOT_LOAD_SUCCESS]: (state, data) => ({
    ...state,
    screenshot: {
      ...state.screenshot,
      ...data,
      loading: false,
    },
  }),

  [GAME_SCREENSHOT_LOAD_FAILED]: (state) => ({
    ...state,
    screenshot: {
      ...state.screenshot,
      loading: false,
    },
  }),

  [GAME_SCREENSHOTS_LOAD_SUCCESS]: (state, data, { push }) => ({
    ...state,
    screenshots: {
      ...state.screenshots,
      ...data,
      results: push ? [...state.screenshots.results, ...data.results] : [...data.results],
      loading: false,
    },
  }),

  [GAME_MOVIES_LOAD]: (state) => ({
    ...state,
    movies: {
      ...state.movies,
      loading: true,
    },
  }),

  [GAME_MOVIES_LOAD_SUCCESS]: (state, data, { push }) => ({
    ...state,
    movies: {
      ...state.movies,
      ...data,
      results: push ? [...state.movies.results, ...data.results] : [...data.results],
      loading: false,
    },
  }),

  [GAME_COLLECTIONS_LOAD]: (state) => ({
    ...state,
    collections: {
      ...state.collections,
      loading: true,
    },
  }),

  [GAME_COLLECTIONS_LOAD_SUCCESS]: (state, data, { push }) => ({
    ...state,
    collections: {
      ...state.collections,
      ...data,
      results: push ? [...state.collections.results, ...data.results] : [...data.results],
      loading: false,
    },
  }),

  [GAME_SUGGESTIONS_LOAD]: (state) => ({
    ...state,
    suggestions: {
      ...state.suggestions,
      loading: true,
    },
  }),

  [GAME_SUGGESTIONS_LOAD_SUCCESS]: (state, data, { page }) => {
    const url = data.next && urlParse(data.next, true);

    return {
      ...state,
      suggestions: {
        ...state.suggestions,
        ...data,
        next: (url && +url.query.page) || null,
        results: page > 1 ? [...state.suggestions.results, ...data.results.result] : [...data.results.result],
        loading: false,
      },
    };
  },

  [GAME_REVIEWS_LOAD]: (state) => ({
    ...state,
    reviews: {
      ...state.reviews,
      loading: true,
    },
  }),

  [GAME_REVIEWS_LOAD_SUCCESS]: (state, data, { push }) => ({
    ...state,
    reviews: {
      ...state.reviews,
      ...data,
      results: push ? [...state.reviews.results, ...data.results] : [...data.results],
      loading: false,
    },
  }),

  [GAME_REVIEWS_UPDATE_SUCCESS]: (state, data) => {
    const { game: gameReviewsUpdate, reviews, removedReview } = data;

    let reviewsResults = state.reviews.results;

    if (removedReview) {
      reviewsResults = reviewsResults.filter((r) => r.id !== removedReview.id);
    }

    return {
      ...state,
      ...gameReviewsUpdate,
      reviews: {
        ...state.reviews,
        ...reviews,
        next: state.reviews.next,
        results: reviewsResults,
        your: reviews.your || null,
      },
    };
  },

  [GAME_POSTS_LOAD]: (state) => ({
    ...state,
    posts: {
      ...state.posts,
      loading: true,
    },
  }),

  [GAME_POSTS_LOAD_SUCCESS]: (state, data, { push }) => ({
    ...state,
    posts: {
      ...state.posts,
      ...data,
      results: push ? [...state.posts.results, ...data.results] : [...data.results],
      loading: false,
    },
  }),

  [GAME_POSTS_UPDATE_SUCCESS]: (state, data) => {
    const { game: gamePostUpdate, posts, removedPost } = data;

    let postsResults = state.posts.results;

    if (removedPost) {
      postsResults = postsResults.filter((r) => r.id !== removedPost.id);
    }

    return {
      ...state,
      ...gamePostUpdate,
      posts: {
        ...state.posts,
        ...posts,
        next: state.posts.next,
        results: postsResults,
        your: posts.your || null,
      },
    };
  },

  [GAME_OWNERS_LOAD]: (state) => ({
    ...state,
    owners: {
      ...state.owners,
      loading: true,
    },
  }),

  [GAME_OWNERS_LOAD_SUCCESS]: (state, data) => ({
    ...state,
    owners: {
      ...data,
      loading: false,
    },
  }),

  [GAME_YOUTUBE_LOAD]: (state) => ({
    ...state,
    youtube: {
      ...state.youtube,
      loading: true,
    },
  }),

  [GAME_YOUTUBE_LOAD_SUCCESS]: (state, data, { push }) => ({
    ...state,
    youtube: {
      ...state.youtube,
      ...data,
      results: push ? [...state.youtube.results, ...data.results] : [...data.results],
      loading: false,
    },
  }),

  [GAME_PERSONS_LOAD]: (state) => ({
    ...state,
    persons: {
      ...state.persons,
      loading: true,
    },
  }),

  [GAME_PERSONS_LOAD_SUCCESS]: (state, data, { push }) => ({
    ...state,
    persons: {
      ...data,
      results: push ? [...state.persons.results, ...data.results.result] : data.results.result,
      loading: false,
      next: data.next ? state.persons.next + 1 : null,
    },
  }),

  [GAME_PERSON_GAMES_LOAD_NEXT]: (state, data, { id }) => {
    const games = state.persons.results.map((person) =>
      person.id === id
        ? {
            ...person,
            games: data.results.slice(0, 3 + (person.next_games || 1) * 3),
            next_games: person.next_games || 1 + 1,
          }
        : person,
    );

    return {
      ...state,
      persons: { ...state.persons, results: games },
    };
  },

  [GAME_IMGUR_LOAD]: (state) => ({
    ...state,
    imgur: {
      ...state.imgur,
      loading: true,
    },
  }),

  [GAME_IMGUR_LOAD_SUCCESS]: (state, data, { push }) => ({
    ...state,
    imgur: {
      ...state.imgur,
      ...data,
      results: push ? [...state.imgur.results, ...data.results] : [...data.results],
      loading: false,
    },
  }),

  [GAME_ACHIEVEMENTS_LOAD]: (state) => ({
    ...state,
    achievements: {
      ...state.achievements,
      loading: true,
    },
  }),

  [GAME_ACHIEVEMENTS_LOAD_SUCCESS]: (state, data, { push }) => ({
    ...state,
    achievements: {
      ...state.achievements,
      ...data,
      results: push ? [...state.achievements.results, ...data.results] : [...data.results],
      loading: false,
    },
  }),

  [GAME_REDDIT_LOAD]: (state) => ({
    ...state,
    reddit: {
      ...state.reddit,
      loading: true,
    },
  }),

  [GAME_REDDIT_LOAD_SUCCESS]: (state, data, { push }) => ({
    ...state,
    reddit: {
      ...state.reddit,
      ...data,
      results: push ? [...state.reddit.results, ...data.results] : [...data.results],
      loading: false,
    },
  }),

  [GAME_TWITCH_LOAD]: (state) => ({
    ...state,
    twitch: {
      ...state.twitch,
      loading: true,
    },
  }),

  [GAME_TWITCH_LOAD_SUCCESS]: (state, data, { push }) => ({
    ...state,
    twitch: {
      ...state.twitch,
      ...data,
      results: push ? [...state.twitch.results, ...data.results] : [...data.results],
      loading: false,
    },
  }),

  [GAME_EDIT_UPLOAD_SCREENSHOT_SUCCESS]: (state, { image }) =>
    evolve(
      {
        screenshots: mapObjIndexed((value, key, object) => {
          const isResults = () => key === 'results';
          const isCount = () => key === 'count';
          const isLastPage = () => !object.next;
          return pipe(
            when(both(isResults, isLastPage), prepend(image)),
            when(isCount, inc),
          )(value);
        }),
      },
      state,
    ),

  [GAME_EDIT_REMOVE_SCREENSHOT_SUCCESS]: (state, { id }) =>
    evolve(
      {
        screenshots: evolve({
          results: adjustByProp('id', id, evolve({ is_deleted: T })),
        }),
      },
      state,
    ),

  [GAME_EDIT_REPLACE_SCREENSHOT_SUCCESS]: (state, { image }) =>
    evolve(
      {
        screenshots: evolve({
          results: adjustByProp('id', image.id, always(image)),
        }),
      },
      state,
    ),

  [GAME_ADDITIONS_LOAD]: (state) =>
    evolve(
      {
        additions: evolve({
          loading: always(true),
        }),
      },
      state,
    ),

  [GAME_ADDITIONS_LOAD_SUCCESS]: (state, data, { push }) =>
    evolve(
      {
        additions: always(
          mergeRight(data, {
            results: push ? [...state.additions.results, ...data.results] : [...data.results],
            loading: false,
          }),
        ),
      },
      state,
    ),

  [GAME_SERIES_LOAD]: (state) =>
    evolve(
      {
        gameSeries: evolve({
          loading: always(true),
        }),
      },
      state,
    ),

  [GAME_SERIES_LOAD_SUCCESS]: (state, data, { push }) =>
    evolve(
      {
        gameSeries: always(
          mergeRight(data, {
            results: push ? [...state.gameSeries.results, ...data.results] : [...data.results],
            loading: false,
          }),
        ),
      },
      state,
    ),

  [GAME_PARENTS_LOAD]: (state) =>
    evolve(
      {
        parents: evolve({
          loading: always(true),
        }),
      },
      state,
    ),

  [GAME_PARENTS_LOAD_SUCCESS]: (state, data, { push }) =>
    evolve(
      {
        parents: always(
          mergeRight(data, {
            results: push ? [...state.parents.results, ...data.results] : [...data.results],
            loading: false,
          }),
        ),
      },
      state,
    ),

  [GAME_CONTRIBUTORS.started]: (state) =>
    evolve(
      {
        contributors: evolve({
          loading: always(true),
        }),
      },
      state,
    ),

  [GAME_CONTRIBUTORS.success]: (state, data, { push }) =>
    evolve(
      {
        contributors: always(
          mergeRight(data, {
            results: push ? [...state.contributors.results, ...data.results] : [...data.results],
            loading: false,
          }),
        ),
      },
      state,
    ),

  [ACTIVITY_FOLLOW_UNFOLLOW_USER]: (state, userId) =>
    evolve(
      {
        contributors: evolve({
          results: map(when(pathEq(['user', 'id'], userId), assocPath(['user', 'follow_loading'], true))),
        }),
      },
      state,
    ),

  [ACTIVITY_UNFOLLOW_USER_SUCCESS]: (state, userId) =>
    evolve(
      {
        contributors: evolve({
          results: map(
            when(
              pathEq(['user', 'id'], userId),
              evolve({
                user: {
                  follow_loading: F,
                  following: F,
                  followers_count: dec,
                },
              }),
            ),
          ),
        }),
      },
      state,
    ),

  [ACTIVITY_FOLLOW_USER_SUCCESS]: (state, userId) =>
    evolve(
      {
        contributors: evolve({
          results: map(
            when(
              pathEq(['user', 'id'], userId),
              evolve({
                user: {
                  follow_loading: F,
                  following: T,
                  followers_count: inc,
                },
              }),
            ),
          ),
        }),
      },
      state,
    ),

  [GAME_USER_COLLECTIONS_LOADING]: (state, { gameSlug }) => {
    if (gameSlug === state.slug) {
      return evolve(
        {
          user_collections: always([]),
        },
        state,
      );
    }

    return state;
  },

  [GAME_USER_COLLECTIONS_LOADED]: (state, { gameSlug, collections }) => {
    if (gameSlug === state.slug) {
      return evolve(
        {
          user_collections: always(collections),
        },
        state,
      );
    }

    return state;
  },

  [GAME_USER_COLLECTION_ADDED]: (state, { collectionId, gameSlug }) => {
    if (gameSlug === state.slug) {
      return evolve(
        {
          user_collections: adjustByProp(
            'id',
            collectionId,
            evolve({
              game_in_collection: T,
            }),
          ),
        },
        state,
      );
    }

    return state;
  },

  [GAME_USER_COLLECTION_REMOVED]: (state, { collectionId, gameSlug }) => {
    if (gameSlug === state.slug) {
      return evolve(
        {
          user_collections: adjustByProp(
            'id',
            collectionId,
            evolve({
              game_in_collection: F,
            }),
          ),
        },
        state,
      );
    }

    return state;
  },

  [GAME_PATCHES_LOAD]: (state) => ({
    ...state,
    patches: {
      ...state.patches,
      loading: true,
    },
  }),

  [GAME_PATCHES_LOAD_SUCCESS]: (state, data, { push }) => ({
    ...state,
    patches: {
      ...state.patches,
      ...data,
      results: push ? [...state.patches.results, ...data.results] : [...data.results],
      loading: false,
    },
  }),

  [GAME_DEMOS_LOAD]: (state) => ({
    ...state,
    demos: {
      ...state.demos,
      loading: true,
    },
  }),

  [GAME_DEMOS_LOAD_SUCCESS]: (state, data, { push }) => ({
    ...state,
    demos: {
      ...state.demos,
      ...data,
      results: push ? [...state.demos.results, ...data.results] : [...data.results],
      loading: false,
    },
  }),

  [GAME_CHEATS_LOAD]: (state) => ({
    ...state,
    cheats: {
      ...state.cheats,
      loading: true,
    },
  }),

  [GAME_CHEATS_LOAD_SUCCESS]: (state, data, { push }) => ({
    ...state,
    cheats: {
      ...state.cheats,
      ...data,
      results: push ? [...state.cheats.results, ...data.results] : [...data.results],
      loading: false,
    },
  }),

  [GAME_CHEAT_LOAD]: (state) => ({
    ...state,
    cheat: {
      loading: true,
    },
  }),

  [GAME_CHEAT_LOAD_SUCCESS]: (state, data) => ({
    ...state,
    cheat: {
      ...data,
      loading: false,
    },
  }),

  [GAME_PATCH_LOAD]: (state) => ({
    ...state,
    patch: {
      loading: true,
    },
  }),

  [GAME_PATCH_LOAD_SUCCESS]: (state, data) => ({
    ...state,
    patch: {
      ...data,
      loading: false,
    },
  }),

  [GAME_DEMO_LOAD]: (state) => ({
    ...state,
    demo: {
      loading: true,
    },
  }),

  [GAME_DEMO_LOAD_SUCCESS]: (state, data) => ({
    ...state,
    demo: {
      ...data,
      loading: false,
    },
  }),

  [GAME_REVIEW_LOAD]: (state) => ({
    ...state,
    review: {
      ...state.review,
      loading: true,
    },
  }),

  [GAME_REVIEW_LOAD_SUCCESS]: (state, data) => ({
    ...state,
    review: {
      ...state.review,
      ...data,
      loading: false,
    },
  }),
});

export default gameEdit;
