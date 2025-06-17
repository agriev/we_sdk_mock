import complement from 'ramda/src/complement';

import compareBy from 'tools/ramda/compare-by';

const locationChanged = complement(
  compareBy(({ location }) => ({
    pathname: location.pathname,
  })),
);

export default locationChanged;
