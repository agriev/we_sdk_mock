import { prepareFilter } from 'app/ui/filter/filter.funcs';
import memoizeOnClient from 'tools/memoize-on-client';
import objValsToArray from 'tools/obj-vals-to-array';

export const DEFAULT_FILTER = '-added';

export const prepareToFilter = (filters) => prepareFilter(objValsToArray(filters), DEFAULT_FILTER);

/* markFilters */
// defaultMarkProps :: { nofollow :: Boolean, count :: Number }
const defaultMarkProperties = {
  nofollow: true,
  count: 0,
};

// findAvailableItemByIdent :: (Array Object, String, a) -> Object
const findAvailableItemByIdent = (availableItems, identKey, ident) =>
  availableItems.find((availableItem) => availableItem[identKey] === ident);

// assignMarkProps :: (Object, Object) -> Object
const assignMarkProperties = (item, { nofollow, count } = defaultMarkProperties) => ({
  ...item,
  nofollow,
  empty: !count,
});

// assignEmptyToItem :: Object -> Object
const markItem = ({ item, availableItems, identKey }) =>
  assignMarkProperties(item, findAvailableItemByIdent(availableItems, identKey, item[identKey]));

// assignEmptyToItems :: (Array Object, Object -> Object) -> Array Object
const markItems = (items, markItemFn) => items.map(markItemFn);

// markSubcat :: Object -> Array Object
const markSubcat = ({ subcat, availableSubcatItems, identKey }) =>
  markItems(subcat, (item) =>
    markItem({
      item,
      availableItems: availableSubcatItems,
      identKey,
    }),
  );

// getAvailableChildren :: Object -> Array Object
const getChildren = (maybeAvailableParent, childrenKey) =>
  maybeAvailableParent ? maybeAvailableParent[childrenKey] : [];

const getAvailableChildren = ({ parent, availableParents, parentsIdent, childrenKey }) =>
  getChildren(findAvailableItemByIdent(availableParents, parentsIdent, parent[parentsIdent]), childrenKey);

const markChildren = (parent, childrenKey, markChildFn) => ({
  ...parent,
  [childrenKey]: markItems(parent[childrenKey], markChildFn(parent)),
});

const markParentsWithChildren = ({ parents, markParentFn, childrenKey, markChildFn }) =>
  parents.map((parent) => markParentFn(markChildren(parent, childrenKey, markChildFn)));

// maybeMark :: (a, Object, () -> Object) -> Object
const maybeMark = (availableFilters, filters, markHandler) =>
  availableFilters && availableFilters.constructor.name === 'Array' ? markHandler() : filters;

// markFilters :: (Object, Object) -> Object
const markFilters = (filters, availableFilters) => ({
  stores: maybeMark(availableFilters.stores, filters.stores, () =>
    markSubcat({
      subcat: filters.stores,
      availableSubcatItems: availableFilters.stores,
      identKey: 'id',
    }),
  ),
  genres: maybeMark(availableFilters.genres, filters.genres, () =>
    markSubcat({
      subcat: filters.genres,
      availableSubcatItems: availableFilters.genres,
      identKey: 'id',
    }),
  ),
  platforms: maybeMark(availableFilters.parent_platforms, filters.platforms, () =>
    markParentsWithChildren({
      parents: filters.platforms,
      markParentFn: (parent) =>
        markItem({
          item: parent,
          availableItems: availableFilters.parent_platforms,
          identKey: 'id',
        }),
      childrenKey: 'platforms',
      markChildFn: (parent) => (child) =>
        markItem({
          item: child,
          identKey: 'id',
          availableItems: getAvailableChildren({
            parent,
            availableParents: availableFilters.parent_platforms,
            parentsIdent: 'id',
            childrenKey: 'platforms',
          }),
        }),
    }),
  ),
  years: maybeMark(availableFilters.years, filters.years, () =>
    markParentsWithChildren({
      parents: filters.years,
      markParentFn: (parent) =>
        markItem({
          item: parent,
          availableItems: availableFilters.years,
          identKey: 'decade',
        }),
      childrenKey: 'years',
      markChildFn: (parent) => (child) =>
        markItem({
          item: child,
          identKey: 'year',
          availableItems: getAvailableChildren({
            parent,
            availableParents: availableFilters.years,
            parentsIdent: 'decade',
            childrenKey: 'years',
          }),
        }),
    }),
  ),
});

// maybeMarkFilters :: (Object, Object) -> Object
export const maybeMarkFilters = memoizeOnClient((filters, availableFilters) =>
  availableFilters ? markFilters(filters, availableFilters) : filters,
);
/* end markFilters */
