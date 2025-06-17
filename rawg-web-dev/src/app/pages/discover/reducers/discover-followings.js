import assoc from 'ramda/src/assoc';
import dissoc from 'ramda/src/dissoc';

import { DISCOVER_FOLLOW_SUCCESS, DISCOVER_UNFOLLOW_SUCCESS } from 'app/pages/discover/discover.actions';

import { COLLECTION_FOLLOW_SUCCESS } from 'app/pages/collection/collection.actions';

const discoverFollowingsReducer = {
  [DISCOVER_FOLLOW_SUCCESS]: (state, { item }) => assoc(`${item.instance}-${item.slug}`, item, state),

  [DISCOVER_UNFOLLOW_SUCCESS]: (state, { item }) => dissoc(`${item.instance}-${item.slug}`, state),

  [COLLECTION_FOLLOW_SUCCESS]: (state, { collection }) => assoc(`collection-${collection.slug}`, collection, state),
};

export default discoverFollowingsReducer;
