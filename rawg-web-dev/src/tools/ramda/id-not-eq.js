import propEq from 'ramda/src/propEq';
import complement from 'ramda/src/complement';

const idNotEq = complement(propEq('id'));

export default idNotEq;
