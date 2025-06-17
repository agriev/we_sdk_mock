import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';

import { resetField } from 'app/pages/game-edit/actions/common';

import defaultTo from 'ramda/src/defaultTo';
import getIds from 'tools/ramda/get-ids';

import GameEditModal from 'app/pages/game-edit/components/modal';
import AddedItems from 'app/pages/game-edit/components/added-items';
import EditModalSelect from './components/select';

import './edit-modal.styl';

import { valueProps, deletedValueProps, typeProps } from '../../select-items.types';

const propTypes = {
  name: PropTypes.string.isRequired,
  dispatch: PropTypes.func.isRequired,
  currentValues: PropTypes.arrayOf(valueProps).isRequired,
  changedValues: PropTypes.arrayOf(valueProps),
  deletedValues: PropTypes.arrayOf(deletedValueProps).isRequired,
  availableItems: PropTypes.arrayOf(valueProps).isRequired,
  availableItemsLoading: PropTypes.bool,
  searchAvailableItems: PropTypes.func,
  title1: PropTypes.node.isRequired,
  title2: PropTypes.node,
  placeholder: PropTypes.node.isRequired,
  desc: PropTypes.node,
  alreadyAddedTitle: PropTypes.node.isRequired,
  onClose: PropTypes.func.isRequired,
  selected: valueProps,
  onSaveItem: PropTypes.func.isRequired,
  type: typeProps.isRequired,
  forbidEditCurrentItems: PropTypes.bool,
  disableSelected: PropTypes.func,
};

const defaultProps = {
  desc: undefined,
  selected: undefined,
  changedValues: undefined,
  searchAvailableItems: undefined,
  availableItemsLoading: undefined,
  forbidEditCurrentItems: false,
  disableSelected: undefined,
};

@hot(module)
class EditModal extends React.Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  onCancelClick = () => {
    this.props.dispatch(resetField(this.props.name));
    this.props.onClose();
  };

  saveItem = (item) => {
    if (item && this.isAvailableToSave(item)) {
      this.props.onSaveItem(item);
    }
  };

  isAvailableToSave(item) {
    const { selected, currentValues, changedValues, type } = this.props;

    const items = defaultTo(currentValues, changedValues);
    const isNotAdded = type === 'strings' ? !items.includes(item) : !getIds(items).includes(item.id);

    return selected || isNotAdded;
  }

  renderSelect() {
    const {
      name,
      availableItems,
      currentValues,
      changedValues,
      availableItemsLoading,
      searchAvailableItems,
      dispatch,
      type,
      disableSelected,
    } = this.props;

    return (
      <div className="game-edit__select-items__modal__input">
        <EditModalSelect
          name={name}
          currentValues={currentValues}
          changedValues={changedValues}
          availableItems={availableItems}
          availableItemsLoading={availableItemsLoading}
          searchAvailableItems={searchAvailableItems}
          saveItem={this.saveItem}
          dispatch={dispatch}
          type={type}
          disableSelected={disableSelected}
        />
      </div>
    );
  }

  render() {
    const {
      name,
      dispatch,
      title1,
      title2,
      onClose,
      desc,
      forbidEditCurrentItems,
      alreadyAddedTitle,
      currentValues,
      changedValues,
      deletedValues,
      selected,
      placeholder,
    } = this.props;

    return (
      <GameEditModal
        title1={title1}
        title2={title2}
        desc={desc}
        onClose={onClose}
        onSave={onClose}
        onCancel={this.onCancelClick}
      >
        {this.renderSelect()}
        <div className="game-edit__select-items__modal__items-title">{alreadyAddedTitle}</div>
        <div className="game-edit__select-items__modal__items">
          <AddedItems
            type="select"
            name={name}
            dispatch={dispatch}
            currentValues={currentValues}
            changedValues={changedValues}
            deletedValues={deletedValues}
            selected={selected}
            placeholder={placeholder}
            forbidEditCurrentItems={forbidEditCurrentItems}
          />
        </div>
      </GameEditModal>
    );
  }
}

export default EditModal;
