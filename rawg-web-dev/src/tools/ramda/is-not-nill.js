import complement from 'ramda/src/complement';
import isNil from 'ramda/src/isNil';

const isNotNil = complement(isNil);

export default isNotNil;
