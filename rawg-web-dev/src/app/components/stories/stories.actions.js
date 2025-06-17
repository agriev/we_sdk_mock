/* eslint-disable import/prefer-default-export, camelcase */

import fetch from 'tools/fetch';

import evolve from 'ramda/src/evolve';
import reject from 'ramda/src/reject';
import propSatisfies from 'ramda/src/propSatisfies';
import isNil from 'ramda/src/isNil';
// import isEmpty from 'ramda/src/isEmpty';
import pipe from 'ramda/src/pipe';
import map from 'ramda/src/map';
import assoc from 'ramda/src/assoc';
import uniqWith from 'ramda/src/uniqWith';
import eqBy from 'ramda/src/eqBy';
import prop from 'ramda/src/prop';
import head from 'ramda/src/head';

import addKeyIfNotExists from 'tools/ramda/add-key-if-not-exists';
import getPagesCount from 'tools/get-pages-count';

export const STORIES_LOAD_GROUPS_START = 'STORIES_LOAD_GROUPS_START';
export const STORIES_LOAD_GROUPS_SUCCESS = 'STORIES_LOAD_GROUPS_SUCCESS';
export const STORIES_LOAD_GROUPS_FAILED = 'STORIES_LOAD_GROUPS_FAILED';

export const STORIES_LOAD_GROUP_START = 'STORIES_LOAD_GROUP_START';
export const STORIES_LOAD_GROUP_SUCCESS = 'STORIES_LOAD_GROUP_SUCCESS';
export const STORIES_LOAD_GROUP_FAILED = 'STORIES_LOAD_GROUP_FAILED';

export const STORIES_LOAD_ADD_GROUPS_START = 'STORIES_LOAD_ADD_GROUPS_START';
export const STORIES_LOAD_ADD_GROUPS_SUCCESS = 'STORIES_LOAD_ADD_GROUPS_SUCCESS';
export const STORIES_LOAD_ADD_GROUPS_FAILED = 'STORIES_LOAD_ADD_GROUPS_FAILED';
export const STORIES_GROUP_PLAYING_FINISHED = 'STORIES_GROUP_PLAYING_FINISHED';

const cutsPerPage = 50;

const cleanResults = pipe(
  // reject(propSatisfies(isEmpty, 'videos')),
  map(
    pipe(
      assoc('played', false),
      assoc('loading', false),
      addKeyIfNotExists('has_new_games', true),
      evolve({
        videos: pipe(
          reject(propSatisfies(isNil, 'url')),
          uniqWith(eqBy(prop('url'))),
        ),
      }),
    ),
  ),
);

export function loadGroup({ slug, lang }) {
  return async (dispatch, getState) => {
    const state = getState();
    const existGroup = state.stories.groups.find((gr) => gr.slug === slug);

    if (existGroup && (existGroup.loading || existGroup.videos)) {
      return;
    }

    dispatch({ type: STORIES_LOAD_GROUP_START, data: { slug } });

    try {
      const group = await fetch(`/api/stories/${slug}`, { data: { lang }, state });

      dispatch({
        type: STORIES_LOAD_GROUP_SUCCESS,
        data: {
          group: head(cleanResults([group])),
        },
      });
    } catch (error) {
      /* eslint-disable no-console */
      console.log(error);

      dispatch({ type: STORIES_LOAD_GROUP_FAILED, data: { slug } });
    }
  };
}

export function loadGroups({ random = false, lang } = {}) {
  return async (dispatch, getState) => {
    const state = getState();

    // Так как после того как ты был гостём и авторизовался
    // нужно всё-таки перезагрузить сторизы, чтобы в группах
    // появились флаги has_new_games
    // if (state.stories.groups.length > 0) {
    //   return false;
    // }

    dispatch({ type: STORIES_LOAD_GROUPS_START });

    try {
      const data = await fetch('/api/stories', {
        state,
        data: {
          short: 'true',
          random_partners: random ? 'true' : 'false',
          page_size: cutsPerPage,
          lang,
        },
      });

      dispatch({
        type: STORIES_LOAD_GROUPS_SUCCESS,
        data: {
          groups: cleanResults(data.results || data || []),
          pagesCount: getPagesCount(data.count, cutsPerPage),
        },
      });

      const firstGroup = data.results[0];
      if (firstGroup) {
        await dispatch(
          loadGroup({
            slug: firstGroup.slug,
            lang,
          }),
        );
      }
    } catch (error) {
      /* eslint-disable no-console */
      console.log(error);

      dispatch({ type: STORIES_LOAD_GROUPS_FAILED });
    }
  };
}

async function loadGroupsPaged({ page = 2, pageSize = cutsPerPage, state, dispatch }) {
  dispatch({ type: STORIES_LOAD_ADD_GROUPS_START });

  return fetch('/api/stories', {
    method: 'get',
    data: {
      page,
      short: 'true',
      page_size: pageSize,
    },
    state,
  })
    .then((data) => {
      dispatch({
        type: STORIES_LOAD_ADD_GROUPS_SUCCESS,
        data: {
          groups: data.results,
        },
      });
    })
    .catch(() => {
      dispatch({ type: STORIES_LOAD_ADD_GROUPS_FAILED });
    });
}

export function loadNextGroupPage() {
  return async (dispatch, getState) => {
    const state = getState();
    const { currentUser } = state;
    const { pagesCount, groups, loading } = state.stories;
    const currentPage = getPagesCount(groups.length, cutsPerPage);

    if (currentPage >= pagesCount || loading) {
      return;
    }

    if (!currentUser.id && groups.length >= 24) {
      return;
    }

    await loadGroupsPaged({
      page: currentPage + 1,
      state,
      dispatch,
    });
  };
}

export function storyPlayingFinished(storyId) {
  return async (dispatch, getState) => {
    const state = getState();

    dispatch({
      type: STORIES_GROUP_PLAYING_FINISHED,
      data: { storyId },
    });

    if (state.currentUser.id) {
      try {
        fetch('/api/stories/viewed', {
          state,
          method: 'patch',
          parse: false,
          data: {
            story_id: storyId,
          },
        });
      } catch (error) {
        console.log('/api/stories/viewed patch failed');
      }
    }
  };
}
