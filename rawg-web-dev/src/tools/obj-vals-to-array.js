import toPairs from 'ramda/src/toPairs';
import pipe from 'ramda/src/pipe';
import reduce from 'ramda/src/reduce';

const objectValsToArray = pipe(
  toPairs,
  reduce((transformed, [key, value]) => ({ ...transformed, [key]: [].concat(value) }), {}),
);

export default objectValsToArray;
