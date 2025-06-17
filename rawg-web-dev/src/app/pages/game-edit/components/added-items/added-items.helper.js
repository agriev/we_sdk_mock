import differenceBy from 'lodash/differenceBy';

import prop from 'ramda/src/prop';
import sortBy from 'ramda/src/sortBy';
import defaultTo from 'ramda/src/defaultTo';

import getIds from 'tools/ramda/get-ids';

export const ItemsTypes = {
  STRING: 'string',
  SELECT: 'select',
  OBJECT: 'object',
};

const sortStrings = (array) => array.sort((a, b) => (a < b ? -1 : 1));
const sortObjects = (array) => sortBy(prop('name'), array);
const sortItems = (array) => (array[0].id ? sortObjects(array) : sortStrings(array));

const getObjectsUnion = (currentValues, changedValues) => {
  const added = differenceBy(currentValues, changedValues || [], 'id');

  return (changedValues || []).concat(added);
};

const getAddedItems = ({ type, currentValues, changedValues }) =>
  type === ItemsTypes.OBJECT ? getObjectsUnion(currentValues, changedValues) : defaultTo(currentValues, changedValues);

const getItemLabel = (item) => (typeof item === 'string' ? item : item.name) || '';

const isSelectedItem = ({ item, selected }) => (item.id ? selected && item.id === selected.id : item === selected);

const isDeletedItem = ({ item, deletedValues }) => deletedValues.includes(item.id || item);

const isNewItem = ({ item, currentValues }) =>
  item.id ? !getIds(currentValues).includes(item.id) : !currentValues.includes(item);

const isUpdatedItem = (props) => {
  const { item, type, currentValues, changedValues } = props;

  if (type !== ItemsTypes.OBJECT) return false;

  return getIds(currentValues || []).includes(item.id) && getIds(changedValues || []).includes(item.id);
};

const hasError = ({ item, type }) => (type === ItemsTypes.OBJECT ? !!item.error : false);

export default {
  ItemsTypes,
  getObjectsUnion,
  sortItems,
  getAddedItems,
  getItemLabel,
  isDeletedItem,
  isNewItem,
  isUpdatedItem,
  hasError,
  isSelectedItem,
};
