import complement from 'ramda/src/complement';
import equals from 'ramda/src/equals';

const notEquals = complement(equals);

export default notEquals;
