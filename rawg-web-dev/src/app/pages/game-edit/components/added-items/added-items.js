import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SVGInline from 'react-svg-inline';
import cn from 'classnames';
import noop from 'lodash/noop';

import paths from 'config/paths';
import itemsHelper, { ItemsTypes } from 'app/pages/game-edit/components/added-items/added-items.helper';

import EmptyItems from 'app/pages/game-edit/components/empty-items';

import closeRoundedIcon from 'assets/icons/close-rounded.svg';
import restoreRoundedIcon from 'assets/icons/restore-rounded.svg';

import './added-items.styl';
import { markValueDeleted, unmarkValueDeleted } from 'app/pages/game-edit/actions/common';

const { STRING, SELECT, OBJECT } = ItemsTypes;

const selectItemType = PropTypes.shape({
  id: PropTypes.number,
  name: PropTypes.string,
  slug: PropTypes.string,
});

const itemsType = PropTypes.oneOfType([PropTypes.string, selectItemType]);
const deletedValuesType = PropTypes.oneOfType([PropTypes.string, PropTypes.number]);

const propTypes = {
  type: PropTypes.oneOf([STRING, SELECT, OBJECT]).isRequired,
  name: PropTypes.string.isRequired,
  dispatch: PropTypes.func.isRequired,
  onItemClick: PropTypes.func,
  onDeleteClick: PropTypes.func,
  getItemLabel: PropTypes.func,
  item: itemsType.isRequired,
  selected: itemsType,
  currentValues: PropTypes.arrayOf(itemsType).isRequired,
  deletedValues: PropTypes.arrayOf(deletedValuesType).isRequired,
  changedValues: PropTypes.arrayOf(PropTypes.object),
  forbidEditCurrentItems: PropTypes.bool,
};

const defaultProps = {
  onItemClick: noop,
  onDeleteClick: noop,
  selected: undefined,
  getItemLabel: undefined,
  changedValues: [],
  forbidEditCurrentItems: false,
};

class AddedItem extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  getClassName(editAllowed) {
    const { item, deletedValues, currentValues, changedValues, type, selected, onItemClick } = this.props;

    const isSelected = itemsHelper.isSelectedItem({ item, selected });
    const isDeleted = itemsHelper.isDeletedItem({ item, deletedValues });
    const isNew = itemsHelper.isNewItem({ item, currentValues });
    const isUpdated = itemsHelper.isUpdatedItem({
      item,
      type,
      currentValues,
      changedValues,
    });
    const isError = itemsHelper.hasError({ item, type });

    return cn('game-edit__added-item', {
      'game-edit__added-item_selectable': editAllowed && onItemClick !== noop,
      'game-edit__added-item_selected': isSelected,
      'game-edit__added-item_new': isNew,
      'game-edit__added-item_deleted': isDeleted,
      'game-edit__added-item_updated': isUpdated,
      'game-edit__added-item_error': isError,
    });
  }

  getItemLabel = (item) => {
    const getItemLabelProp = this.props.getItemLabel;

    if (getItemLabelProp) {
      return getItemLabelProp(item);
    }

    return itemsHelper.getItemLabel(item);
  };

  onDeleteYesClick = (event) => {
    event.stopPropagation();

    const { item, name, dispatch, onDeleteClick } = this.props;

    onDeleteClick();
    dispatch(markValueDeleted(name, item.id || item));
  };

  onDeleteNoClick = (event) => {
    event.stopPropagation();

    const { item, name, dispatch } = this.props;

    dispatch(unmarkValueDeleted(name, item.id || item));
  };

  onItemClick = () => {
    const { item, onItemClick } = this.props;

    onItemClick(item);
  };

  rootRef = (element) => {
    this.rootEl = element;
  };

  render() {
    const { item, currentValues, deletedValues, forbidEditCurrentItems } = this.props;

    const isDeleted = itemsHelper.isDeletedItem({ item, deletedValues });
    const editAllowed = itemsHelper.isNewItem({ item, currentValues }) || !forbidEditCurrentItems;

    return (
      <div
        onClick={isDeleted || !editAllowed ? noop : this.onItemClick}
        className={this.getClassName(editAllowed)}
        ref={this.rootRef}
        role="button"
        tabIndex={0}
      >
        {item.icon && (
          <div className="game-edit__added-item__icon">
            <img src={paths.svgImagePath(item.icon)} alt={item.name} height={24} />
          </div>
        )}
        <div className={cn('game-edit__added-item__text', { 'delete-allowed': editAllowed })}>
          {this.getItemLabel(item)}
        </div>
        {editAllowed && (
          <div className="game-edit__added-item__close">
            {!isDeleted && <SVGInline onClickCapture={this.onDeleteYesClick} svg={closeRoundedIcon} />}
            {isDeleted && <SVGInline onClickCapture={this.onDeleteNoClick} svg={restoreRoundedIcon} />}
          </div>
        )}
      </div>
    );
  }
}

const AddedItems = ({
  /* eslint-disable react/prop-types */
  dispatch,
  type,
  name,
  onItemClick,
  selected,
  changedValues,
  currentValues,
  deletedValues,
  placeholder,
  forbidEditCurrentItems,
  getItemLabel,
}) => {
  const addedItems = itemsHelper.getAddedItems({
    type,
    currentValues,
    changedValues,
  });

  return addedItems.length > 0 ? (
    itemsHelper
      .sortItems(addedItems)
      .map((item) => (
        <AddedItem
          onItemClick={onItemClick}
          selected={selected}
          key={item.id || item}
          name={name}
          type={type}
          dispatch={dispatch}
          item={item}
          currentValues={currentValues}
          changedValues={changedValues}
          deletedValues={deletedValues}
          forbidEditCurrentItems={forbidEditCurrentItems}
          getItemLabel={getItemLabel}
        />
      ))
  ) : (
    <EmptyItems placeholder={placeholder} />
  );
};

export default AddedItems;
