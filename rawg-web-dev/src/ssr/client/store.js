import { browserHistory } from 'react-router';
import createStore from 'config/store';

import initialState from './initial-state';

const store = createStore(browserHistory, initialState);

export default store;
