import propEq from 'ramda/src/propEq';
import complement from 'ramda/src/complement';

const propertyNotEq = complement(propEq);

export default propertyNotEq;
