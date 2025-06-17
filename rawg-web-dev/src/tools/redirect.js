import { push } from 'react-router-redux';
import Error301 from 'interfaces/error-301';

const makeRedirect = (dispatch, url) => {
  if (typeof window === 'undefined') {
    throw new Error301(url);
  } else {
    dispatch(push(url));
  }
};

export default makeRedirect;
