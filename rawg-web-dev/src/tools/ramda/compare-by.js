import curry from 'ramda/src/curry';

import isEqual from 'react-fast-compare';

const compareBy = curry((getKeysFunc, first, second) => isEqual(getKeysFunc(first), getKeysFunc(second)));

export default compareBy;
