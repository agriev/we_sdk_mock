import { POST_SAVE_FAIL, POST_CLEAN } from 'app/components/post-form/post-form.actions';
import { POST_LOAD, POST_LOAD_SUCCESS } from './post.actions';

export const initialState = {
  id: '',
  game: {},
  user: {},
  loading: false,
  errors: {},
};

export default function post(state = initialState, action) {
  switch (action.type) {
    case POST_LOAD:
      return {
        ...state,
        errors: {},
        loading: true,
      };

    case POST_LOAD_SUCCESS:
      return {
        ...state,
        ...action.data,
        loading: false,
      };

    case POST_SAVE_FAIL:
      return {
        ...state,
        errors: action.data,
        loading: false,
      };

    case POST_CLEAN:
      return {
        ...initialState,
      };

    default:
      return state;
  }
}
