import map from 'ramda/src/map';
import prop from 'ramda/src/prop';

const getIds = map(prop('id'));

export default getIds;
