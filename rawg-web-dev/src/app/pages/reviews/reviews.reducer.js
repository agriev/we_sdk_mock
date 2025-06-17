import { combineReducers } from 'redux';

import { REVIEWS_NEW, REVIEWS_POPULAR, REVIEWS_SET_DISPLAY_MODE } from 'app/pages/reviews/reviews.actions';
import { MODE_SELECTOR_LIST } from 'app/components/mode-selector/mode-selector.helper';

import paginate from 'redux-logic/reducer-creators/paginate';
import createReducer from 'tools/redux/create-reducer';

const defaultDisplayMode = MODE_SELECTOR_LIST;

const reviewsReducer = combineReducers({
  displayMode: createReducer(defaultDisplayMode, {
    [REVIEWS_SET_DISPLAY_MODE]: (state, { mode }) => mode,
  }),
  new: paginate({ types: REVIEWS_NEW.array }),
  popular: paginate({ types: REVIEWS_POPULAR.array }),
});

export default reviewsReducer;
