import {
  // REVIEW_SAVE,
  REVIEW_SAVE_FAIL,
  REVIEW_CLEAN,
} from 'app/components/review-form/review-form.actions';
import { REVIEW_LOAD, REVIEW_LOAD_SUCCESS } from './review.actions';

export const initialState = {
  id: '',
  game: {},
  user: {},
  loading: false,
  errors: {},
  text: '',
  rating: null,
  reactions: [],
  is_text: false,
  noindex: false,
};

export default function review(state = initialState, action) {
  switch (action.type) {
    case REVIEW_LOAD:
      return {
        ...state,
        errors: {},
        loading: true,
      };

    case REVIEW_LOAD_SUCCESS:
      return {
        ...state,
        ...action.data,
        loading: false,
      };

    case REVIEW_SAVE_FAIL:
      return {
        ...state,
        errors: action.data,
        loading: false,
      };

    case REVIEW_CLEAN:
      return {
        ...initialState,
      };

    default:
      return state;
  }
}
