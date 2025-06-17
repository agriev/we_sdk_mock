import evolve from 'ramda/src/evolve';
import pipe from 'ramda/src/pipe';
import T from 'ramda/src/T';
import F from 'ramda/src/F';

import {
  DISCOVER_FOLLOW_START,
  DISCOVER_FOLLOW_SUCCESS,
  DISCOVER_FOLLOW_FAILED,
  DISCOVER_UNFOLLOW_START,
  DISCOVER_UNFOLLOW_SUCCESS,
  DISCOVER_UNFOLLOW_FAILED,
} from 'app/pages/discover/discover.actions';

import addKeyIfNotExists from 'tools/ramda/add-key-if-not-exists';

const onFollowToggleStart = (state, { item }) =>
  evolve(
    {
      [`${item.instance}-${item.slug}`]: pipe(
        addKeyIfNotExists('followLoading', false),
        addKeyIfNotExists('following', false),
        evolve({
          followLoading: T,
        }),
      ),
    },
    state,
  );

const onFollowFinish = (final) => (state, { item }) =>
  evolve(
    {
      [`${item.instance}-${item.slug}`]: {
        followLoading: F,
        following: final,
      },
    },
    state,
  );

const discoverSearchReducer = {
  [DISCOVER_FOLLOW_START]: onFollowToggleStart,
  [DISCOVER_UNFOLLOW_START]: onFollowToggleStart,
  [DISCOVER_FOLLOW_SUCCESS]: onFollowFinish(T),
  [DISCOVER_FOLLOW_FAILED]: onFollowFinish(F),
  [DISCOVER_UNFOLLOW_SUCCESS]: onFollowFinish(F),
  [DISCOVER_UNFOLLOW_FAILED]: onFollowFinish(T),
};

export default discoverSearchReducer;
