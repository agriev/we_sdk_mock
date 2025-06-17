import createReducer from 'tools/redux/create-reducer';

import evolve from 'ramda/src/evolve';
import union from 'ramda/src/union';
import without from 'ramda/src/without';
import ifElse from 'ramda/src/ifElse';
import pipe from 'ramda/src/pipe';
import defaultTo from 'ramda/src/defaultTo';
import when from 'ramda/src/when';
import map from 'ramda/src/map';
import mapObjIndexed from 'ramda/src/mapObjIndexed';
import prop from 'ramda/src/prop';
import propIs from 'ramda/src/propIs';
import unionWith from 'ramda/src/unionWith';
import eqBy from 'ramda/src/eqBy';
import sortBy from 'ramda/src/sortBy';
import is from 'ramda/src/is';
import always from 'ramda/src/always';
import both from 'ramda/src/both';
import inc from 'ramda/src/inc';
import assoc from 'ramda/src/assoc';
import concat from 'ramda/src/concat';
import propEq from 'ramda/src/propEq';
import __ from 'ramda/src/__';
import T from 'ramda/src/T';
import F from 'ramda/src/F';

import pullAllBy from 'lodash/pullAllBy';

import {
  GAME_EDIT_UPDATE_FIELD,
  GAME_EDIT_MARK_VALUE_DELETED,
  GAME_EDIT_UNMARK_VALUE_DELETED,
  GAME_EDIT_RESET_FIELD,
  GAME_EDIT_RESET_FIELDS,
  GAME_EDIT_RESET_ALL,
  GAME_EDIT_FILL_DATA,
} from 'app/pages/game-edit/actions/common';

import {
  GAME_EDIT_SUBMIT_START,
  GAME_EDIT_SUBMIT_FINISH,
  GAME_EDIT_SUBMIT_FAIL,
} from 'app/pages/game-edit/actions/basic';

import {
  GAME_EDIT_UPLOAD_SCREENSHOTS_START,
  GAME_EDIT_UPLOAD_SCREENSHOT_SUCCESS,
  GAME_EDIT_UPLOAD_SCREENSHOT_FAIL,
  GAME_EDIT_UPLOAD_SCREENSHOTS_FINISH,
} from 'app/pages/game-edit/actions/screenshots';

import {
  GAME_EDIT_STORES_FILL,
  GAME_EDIT_STORES_NOT_FOUND,
  GAME_EDIT_STORES_UPDATE_START,
  GAME_EDIT_STORES_UPDATE_FINISH,
  GAME_EDIT_STORES_ERROR,
} from 'app/pages/game-edit/actions/stores';

import {
  GAME_EDIT_TAGS_UPDATE_FINISH,
  GAME_EDIT_TAGS_FILL,
  GAME_EDIT_TAGS_UPDATE_START,
  SEARCH_TAGS_STARTED,
  SEARCH_TAGS_FINISHED,
} from 'app/pages/game-edit/actions/tags';

import {
  GAME_EDIT_CREATORS_FILL_STARTED,
  GAME_EDIT_CREATORS_FILL,
  GAME_EDIT_CREATORS_UPDATE_START,
  GAME_EDIT_CREATORS_UPDATE_FINISH,
  SEARCH_CREATORS_STARTED,
  SEARCH_CREATORS_FINISHED,
  CREATORS_LOAD_POSITIONS,
  GAME_EDIT_CREATORS_NOT_FOUND,
  GAME_EDIT_CREATORS_ERROR,
} from 'app/pages/game-edit/actions/creators';

import {
  GAME_EDIT_ADDITIONS_FILL,
  GAME_EDIT_ADDITIONS_FILL_STARTED,
  GAME_EDIT_ADDITIONS_ERROR,
  GAME_EDIT_ADDITIONS_NOT_FOUND,
} from 'app/pages/game-edit/actions/additions';

import {
  GAME_EDIT_GAMESERIES_FILL_STARTED,
  GAME_EDIT_GAMESERIES_FILL,
  GAME_EDIT_GAMESERIES_ERROR,
  GAME_EDIT_GAMESERIES_NOT_FOUND,
} from 'app/pages/game-edit/actions/game-series';

const initialState = {
  errors: {},
  id: null,
  submitting: false,
  submitted: false,
  wasEdited: false,
  uploadingImages: {
    active: false,
    allCount: 0,
    uploadedCount: 0,
  },
  name: {
    current: null,
    changed: null,
  },
  alternative_names: {
    current: [],
    changed: null,
    deleted: [],
    type: 'strings',
  },
  image: {
    current: null,
    changed: null,
  },
  description: {
    current: null,
    changed: null,
  },
  esrb_rating: {
    current: null,
    changed: null,
  },
  platforms: {
    current: [],
    changed: null,
    deleted: [],
    type: 'objects',
  },
  genres: {
    current: [],
    changed: null,
    deleted: [],
    type: 'objects',
  },
  released: {
    current: null,
    changed: null,
  },
  tba: {
    current: false,
    changed: null,
  },
  developers: {
    current: [],
    changed: null,
    deleted: [],
    type: 'objects',
  },
  publishers: {
    current: [],
    changed: null,
    deleted: [],
    type: 'objects',
  },
  website: {
    current: null,
    changed: null,
  },
  reddit_url: {
    current: null,
    changed: null,
  },
  metacritic_url: {
    current: null,
    changed: null,
  },
  stores: {
    current: [],
    changed: null,
    deleted: [],
    type: 'objects',
  },
  tags: {
    current: [],
    changed: null,
    deleted: [],
    type: 'strings',
    search: {
      value: '',
      items: [],
      loading: false,
    },
  },
  creators: {
    current: [],
    changed: null,
    deleted: [],
    type: 'objects',
    positions: [],
    search: {
      value: '',
      items: [],
      loading: false,
    },
  },
  additions: {
    current: [],
    changed: null,
    deleted: [],
    type: 'objects',
  },
  gameSeries: {
    current: [],
    changed: null,
    deleted: [],
    type: 'objects',
  },
};

const gameEdit = createReducer(initialState, {
  [GAME_EDIT_UPDATE_FIELD]: (state, { name, value }) =>
    evolve(
      {
        wasEdited: always(true),
        [name]: evolve({ changed: always(value) }),
      },
      state,
    ),

  [GAME_EDIT_MARK_VALUE_DELETED]: (state, { name, value }) =>
    evolve(
      {
        wasEdited: always(true),
        [name]: evolve({
          deleted: union(__, [value]),
        }),
      },
      state,
    ),

  [GAME_EDIT_UNMARK_VALUE_DELETED]: (state, { name, value }) =>
    evolve(
      {
        [name]: evolve({
          deleted: without([value]),
        }),
      },
      state,
    ),

  [GAME_EDIT_RESET_FIELD]: (state, { name }) =>
    evolve(
      {
        [name]: evolve({
          changed: always(null),
          deleted: always(initialState[name].deleted),
        }),
      },
      state,
    ),

  [GAME_EDIT_RESET_FIELDS]: mapObjIndexed(
    when(
      is(Object),
      evolve({
        changed: always(null),
        deleted: always([]),
      }),
    ),
  ),

  [GAME_EDIT_RESET_ALL]: always(initialState),

  [GAME_EDIT_FILL_DATA]: (state, { game }) => {
    const setField = (field, def) => (fieldData) => {
      const isArray = (data) => Array.isArray(data);
      const isPlatform = (data) => isArray(data) && field === 'platforms';
      const isImage = () => field === 'image';
      const isDescription = () => field === 'description';
      const isRating = () => field === 'esrb_rating';
      const getPlatform = when(propIs(Object, 'platform'), prop('platform'));
      const mapIfPlatform = when(isPlatform, map(getPlatform));
      const changeIfImage = when(both(isImage, always(!!game.background_image)), always(game.background_image));
      const rawIfDescription = when(isDescription, always(game.description_raw));
      const idIfRating = when(isRating, prop('id'));

      const fromBack = pipe(
        always(game[field]),
        mapIfPlatform,
        changeIfImage,
        rawIfDescription,
        idIfRating,
        defaultTo(def),
        when(isArray, sortBy(prop('id'))),
      );

      const isObjectsArray = () => fieldData.type === 'objects';
      const unionObjects = unionWith(eqBy(prop('id')), fromBack());
      const unionStrings = union(fromBack());
      const unionLogic = ifElse(isObjectsArray, unionObjects, unionStrings);

      return evolve(
        {
          current: fromBack,
          changed: when(isArray, unionLogic),
          deleted: defaultTo(def),
        },
        fieldData,
      );
    };

    return evolve(
      {
        name: setField('name', ''),
        alternative_names: setField('alternative_names', []),
        image: setField('image', null),
        description: setField('description', ''),
        esrb_rating: setField('esrb_rating', undefined),
        platforms: setField('platforms', []),
        genres: setField('genres', []),
        released: setField('released', ''),
        tba: setField('tba', false),
        developers: setField('developers', []),
        publishers: setField('publishers', []),
        website: setField('website', ''),
        reddit_url: setField('reddit_url', ''),
        metacritic_url: setField('metacritic_url', ''),
      },
      state,
    );
  },

  [GAME_EDIT_SUBMIT_START]: evolve({
    submitting: always(true),
    submitted: always(false),
    errors: always({}),
  }),

  [GAME_EDIT_SUBMIT_FINISH]: evolve({
    submitting: always(false),
    submitted: always(true),
  }),

  [GAME_EDIT_SUBMIT_FAIL]: (state, errors) =>
    evolve(
      {
        submitting: always(false),
        submitted: always(false),
        errors: always(errors || {}),
      },
      state,
    ),

  [GAME_EDIT_UPLOAD_SCREENSHOTS_START]: (state, { count }) =>
    evolve(
      {
        uploadingImages: evolve({
          active: always(true),
          allCount: always(count),
          uploadedCount: always(0),
        }),
      },
      state,
    ),

  [GAME_EDIT_UPLOAD_SCREENSHOT_SUCCESS]: evolve({
    uploadingImages: evolve({
      uploadedCount: inc,
    }),
  }),

  [GAME_EDIT_UPLOAD_SCREENSHOT_FAIL]: evolve({
    uploadingImages: evolve({
      uploadedCount: inc,
    }),
  }),

  [GAME_EDIT_UPLOAD_SCREENSHOTS_FINISH]: evolve({
    uploadingImages: evolve({
      active: always(false),
      allCount: always(0),
      uploadedCount: always(0),
    }),
    wasEdited: always(true),
  }),

  [GAME_EDIT_STORES_FILL]: (state, { stores }) =>
    evolve(
      {
        stores: evolve({
          current: always(map((store) => assoc('url', store.url, { ...store.store, resourceId: store.id }), stores)),
          changed: always(null),
          deleted: always([]),
        }),
      },
      state,
    ),

  [GAME_EDIT_STORES_ERROR]: (state, { item, error }) =>
    evolve(
      {
        stores: {
          changed: map(when(propEq('id', item.id), assoc('error', error))),
        },
      },
      state,
    ),

  [GAME_EDIT_STORES_NOT_FOUND]: (state, { item }) =>
    evolve(
      {
        stores: {
          current: always(pullAllBy(state.stores.current, [item], 'id')),
          changed: always(pullAllBy(state.stores.changed, [item], 'id')),
          deleted: always(pullAllBy(state.stores.deleted, [item.id])),
        },
      },
      state,
    ),

  [GAME_EDIT_STORES_UPDATE_START]: evolve({
    submitting: always(true),
    submitted: always(false),
    errors: always({}),
  }),

  [GAME_EDIT_STORES_UPDATE_FINISH]: evolve({
    submitting: always(false),
    submitted: always(true),
  }),

  [GAME_EDIT_CREATORS_ERROR]: (state, { item, error }) =>
    evolve(
      {
        creators: {
          changed: map(when(propEq('id', item.id), assoc('error', error))),
        },
      },
      state,
    ),

  [GAME_EDIT_CREATORS_NOT_FOUND]: (state, { item }) =>
    evolve(
      {
        creators: {
          current: always(pullAllBy(state.creators.current, [item], 'id')),
          changed: always(pullAllBy(state.creators.changed, [item], 'id')),
          deleted: always(pullAllBy(state.creators.deleted, [item.id])),
        },
      },
      state,
    ),

  [GAME_EDIT_TAGS_FILL]: (state, { tags }) =>
    evolve(
      {
        tags: evolve({
          current: always(tags.map(prop('name'))),
          changed: always(null),
          deleted: always([]),
        }),
      },
      state,
    ),

  [GAME_EDIT_TAGS_UPDATE_START]: evolve({
    submitting: always(true),
    submitted: always(false),
    errors: always({}),
  }),

  [GAME_EDIT_TAGS_UPDATE_FINISH]: evolve({
    submitting: always(false),
    submitted: always(true),
  }),

  [SEARCH_TAGS_STARTED]: evolve({
    tags: {
      search: {
        value: always(''),
        items: always([]),
        loading: T,
      },
    },
  }),

  [SEARCH_TAGS_FINISHED]: (state, { value, items }) =>
    evolve(
      {
        tags: {
          search: {
            value: always(value),
            items: always(items),
            loading: F,
          },
        },
      },
      state,
    ),

  [GAME_EDIT_CREATORS_FILL_STARTED]: evolve({
    creators: {
      current: always([]),
      changed: always(null),
      deleted: always([]),
    },
  }),

  [GAME_EDIT_CREATORS_FILL]: (state, { results }) =>
    evolve(
      {
        creators: {
          current: concat(__, results),
        },
      },
      state,
    ),

  [GAME_EDIT_CREATORS_UPDATE_START]: evolve({
    submitting: always(true),
    submitted: always(false),
    errors: always({}),
  }),

  [GAME_EDIT_CREATORS_UPDATE_FINISH]: evolve({
    submitting: always(false),
    submitted: always(true),
  }),

  [SEARCH_CREATORS_STARTED]: evolve({
    creators: {
      search: {
        value: always(''),
        items: always([]),
        loading: T,
      },
    },
  }),

  [SEARCH_CREATORS_FINISHED]: (state, { value, items }) =>
    evolve(
      {
        creators: {
          search: {
            value: always(value),
            items: always(items),
            loading: F,
          },
        },
      },
      state,
    ),

  [CREATORS_LOAD_POSITIONS.started]: evolve({
    creators: {
      positions: always([]),
    },
  }),

  [CREATORS_LOAD_POSITIONS.success]: (state, { positions }) =>
    evolve(
      {
        creators: {
          positions: always(positions),
        },
      },
      state,
    ),

  [GAME_EDIT_ADDITIONS_FILL_STARTED]: evolve({
    additions: {
      current: always([]),
      changed: always(null),
      deleted: always([]),
    },
  }),

  [GAME_EDIT_ADDITIONS_FILL]: (state, { results }) =>
    evolve(
      {
        additions: {
          current: concat(__, results),
        },
      },
      state,
    ),

  [GAME_EDIT_ADDITIONS_ERROR]: (state, { item, error }) =>
    evolve(
      {
        additions: {
          changed: map(when(propEq('id', item.id), assoc('error', error))),
        },
      },
      state,
    ),

  [GAME_EDIT_ADDITIONS_NOT_FOUND]: (state, { item }) =>
    evolve(
      {
        additions: {
          current: always(pullAllBy(state.additions.current, [item], 'id')),
          changed: always(pullAllBy(state.additions.changed, [item], 'id')),
          deleted: always(pullAllBy(state.additions.deleted, [item.id])),
        },
      },
      state,
    ),

  [GAME_EDIT_GAMESERIES_FILL_STARTED]: evolve({
    gameSeries: {
      current: always([]),
      changed: always(null),
      deleted: always([]),
    },
  }),

  [GAME_EDIT_GAMESERIES_FILL]: (state, { results }) =>
    evolve(
      {
        gameSeries: {
          current: concat(__, results),
        },
      },
      state,
    ),

  [GAME_EDIT_GAMESERIES_ERROR]: (state, { item, error }) =>
    evolve(
      {
        gameSeries: {
          changed: map(when(propEq('id', item.id), assoc('error', error))),
        },
      },
      state,
    ),

  [GAME_EDIT_GAMESERIES_NOT_FOUND]: (state, { item }) =>
    evolve(
      {
        gameSeries: {
          current: always(pullAllBy(state.gameSeries.current, [item], 'id')),
          changed: always(pullAllBy(state.gameSeries.changed, [item], 'id')),
          deleted: always(pullAllBy(state.gameSeries.deleted, [item.id])),
        },
      },
      state,
    ),
});

export default gameEdit;
