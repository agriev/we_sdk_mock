import prepend from 'ramda/src/prepend';
import always from 'ramda/src/always';
import evolve from 'ramda/src/evolve';
import map from 'ramda/src/map';
import pathEq from 'ramda/src/pathEq';
import concat from 'ramda/src/concat';
import uniqWith from 'ramda/src/uniqWith';
import eqBy from 'ramda/src/eqBy';
import prop from 'ramda/src/prop';
import F from 'ramda/src/F';
import T from 'ramda/src/T';
import __ from 'ramda/src/__';
import pipe from 'ramda/src/pipe';
import ifElse from 'ramda/src/ifElse';
import lte from 'ramda/src/lte';
import assoc from 'ramda/src/assoc';

import createReducer from 'tools/redux/create-reducer';

import {
  GAME_STATUS_CHANGE,
  GAME_STATUS_DELETE,
  GAME_STATUS_CREATE,
} from 'app/components/game-menu-collections/game-menu.actions';

import adjustByFunc from 'tools/ramda/adjust-by-func';
import adjustByProp from 'tools/ramda/adjust-by-property';

import findIndexByProp from 'tools/ramda/find-index-by-property';
import {
  STORIES_LOAD_GROUPS_START,
  STORIES_LOAD_GROUPS_FAILED,
  STORIES_LOAD_GROUPS_SUCCESS,
  STORIES_GROUP_PLAYING_FINISHED,
  STORIES_LOAD_ADD_GROUPS_SUCCESS,
  STORIES_LOAD_ADD_GROUPS_START,
  STORIES_LOAD_ADD_GROUPS_FAILED,
  STORIES_LOAD_GROUP_START,
  STORIES_LOAD_GROUP_FAILED,
  STORIES_LOAD_GROUP_SUCCESS,
} from './stories.actions';

const uniqGroups = uniqWith(eqBy(prop('id')));

const groupExists = (group) =>
  pipe(
    findIndexByProp('slug', group.slug),
    lte(0),
  );

const initialState = {
  loading: false,
  groups: [],
  pagesCount: 0,
};

const storiesReducer = createReducer(initialState, {
  [STORIES_LOAD_GROUPS_START]: evolve({ loading: T }),
  [STORIES_LOAD_GROUP_START]: (state, { slug }) =>
    evolve(
      {
        loading: T,
        groups: adjustByProp('slug', slug, evolve({ loading: T })),
      },
      state,
    ),
  [STORIES_LOAD_ADD_GROUPS_START]: evolve({ loading: T }),

  [STORIES_LOAD_ADD_GROUPS_FAILED]: evolve({ loading: F }),
  [STORIES_LOAD_GROUPS_FAILED]: evolve({ loading: F }),
  [STORIES_LOAD_GROUP_FAILED]: (state, { slug }) =>
    evolve(
      {
        loading: F,
        groups: adjustByProp('slug', slug, evolve({ loading: F })),
      },
      state,
    ),

  [STORIES_LOAD_GROUPS_SUCCESS]: (state, { groups, pagesCount }) =>
    evolve(
      {
        loading: F,
        groups: pipe(
          concat(__, groups),
          uniqGroups,
        ),
        pagesCount: always(pagesCount),
      },
      state,
    ),

  [STORIES_LOAD_ADD_GROUPS_SUCCESS]: (state, { groups }) =>
    evolve(
      {
        groups: pipe(
          concat(__, groups),
          uniqGroups,
        ),
        loading: F,
      },
      state,
    ),

  [STORIES_LOAD_GROUP_SUCCESS]: (state, { group }) =>
    evolve(
      {
        loading: F,
        groups: pipe(
          ifElse(
            groupExists(group),
            adjustByProp(
              'slug',
              group.slug,
              pipe(
                assoc('videos', group.videos),
                assoc('loading', false),
              ),
            ),
            prepend(group),
          ),
          uniqGroups,
        ),
      },
      state,
    ),

  [GAME_STATUS_CHANGE]: (state, { id, status }) =>
    evolve(
      {
        groups: map(
          evolve({
            videos: adjustByFunc(
              pathEq(['game', 'id'], id),
              evolve({
                game: evolve({
                  user_game: evolve({
                    added: new Date().toISOString(),
                    status: always(status),
                  }),
                }),
              }),
            ),
          }),
        ),
      },
      state,
    ),

  [GAME_STATUS_CREATE]: (state, { id, status }) =>
    evolve(
      {
        groups: map(
          evolve({
            videos: adjustByFunc(
              pathEq(['game', 'id'], id),
              evolve({
                game: evolve({
                  user_game: always({
                    added: new Date().toISOString(),
                    platforms: [],
                    status,
                  }),
                }),
              }),
            ),
          }),
        ),
      },
      state,
    ),

  [GAME_STATUS_DELETE]: (state, { id }) =>
    evolve(
      {
        groups: map(
          evolve({
            videos: adjustByFunc(
              pathEq(['game', 'id'], id),
              evolve({
                game: evolve({
                  user_game: always(null),
                }),
              }),
            ),
          }),
        ),
      },
      state,
    ),

  [STORIES_GROUP_PLAYING_FINISHED]: (state, { storyId }) =>
    evolve(
      {
        groups: adjustByProp(
          'id',
          storyId,
          evolve({
            has_new_games: F,
            played: T,
          }),
        ),
      },
      state,
    ),
});

export default storiesReducer;
