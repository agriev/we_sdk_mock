import assoc from 'ramda/src/assoc';
import when from 'ramda/src/when';
import has from 'ramda/src/has';
import complement from 'ramda/src/complement';

const isntHas = complement(has);

const addKeyIfNotExists = (key, value) => {
  return when(isntHas(key), assoc(key, value));
};

export default addKeyIfNotExists;
