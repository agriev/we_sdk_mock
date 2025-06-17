import get from 'lodash/get';

import { cleanQuery } from 'app/ui/filter/filter.funcs';
import { sortTypes } from 'app/components/discover-filter/discover-filter';

const prepareCollectionFilter = (filterQuery) => {
  const filter = cleanQuery(filterQuery);
  const ordering = get(filter, 'ordering', []);
  const defaultOrdering = sortTypes.created;

  if (ordering.length === 0 && defaultOrdering) {
    return {
      ...filter,
      ordering: [defaultOrdering],
    };
  }

  return filter;
};

export default prepareCollectionFilter;
