import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';

import path from 'ramda/src/path';
import defaultTo from 'ramda/src/defaultTo';
import append from 'ramda/src/append';
import update from 'ramda/src/update';

import { updateField, unmarkValueDeleted } from 'app/pages/game-edit/actions/common';

import AddBtn from 'app/pages/game-edit/components/add-btn';
import AddedItems from 'app/pages/game-edit/components/added-items';
import EditModal from './components/edit-modal';

import './select-items.styl';

import { valueProps, deletedValueProps, typeProps } from './select-items.types';

@hot(module)
@connect((state, props) => ({
  currentValues: path(['gameEdit', props.name, 'current'], state),
  changedValues: path(['gameEdit', props.name, 'changed'], state),
  deletedValues: path(['gameEdit', props.name, 'deleted'], state),
  type: path(['gameEdit', props.name, 'type'], state),
}))
class SelectItems extends React.Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
    placeholder: PropTypes.node,
    currentValues: PropTypes.arrayOf(valueProps),
    changedValues: PropTypes.arrayOf(valueProps),
    deletedValues: PropTypes.arrayOf(deletedValueProps),
    availableItems: PropTypes.arrayOf(valueProps),
    availableItemsLoading: PropTypes.bool,
    searchAvailableItems: PropTypes.func,
    readOnly: PropTypes.bool,
    addText: PropTypes.node,
    changeText: PropTypes.node,
    title1: PropTypes.node.isRequired,
    title2: PropTypes.node,
    desc: PropTypes.node,
    alreadyAddedTitle: PropTypes.node,
    dispatch: PropTypes.func.isRequired,
    type: typeProps.isRequired,
    forbidEditCurrentItems: PropTypes.bool,
    disableSelected: PropTypes.func,
  };

  static defaultProps = {
    currentValues: [],
    changedValues: undefined,
    deletedValues: [],
    availableItems: [],
    searchAvailableItems: undefined,
    availableItemsLoading: undefined,
    readOnly: false,
    placeholder: 'Add some items',
    addText: 'Add',
    changeText: 'Change',
    alreadyAddedTitle: 'Already added',
    desc: undefined,
    forbidEditCurrentItems: false,
    disableSelected: undefined,
  };

  constructor(props) {
    super(props);

    this.state = {
      modalOpened: false,
      selected: undefined,
    };
  }

  onClickToAddBtn = () => {
    this.setState({ modalOpened: true });
  };

  onCloseModal = () => {
    this.setState({ modalOpened: false, selected: undefined });
  };

  onSaveItem = (text) => {
    const { name, dispatch, currentValues, changedValues } = this.props;

    const { selected } = this.state;

    if (selected) {
      const idx = changedValues.indexOf(selected);
      dispatch(updateField(name, update(idx, text, changedValues)));
      dispatch(unmarkValueDeleted(name, selected));

      this.setState({ selected: undefined });
    } else {
      const items = defaultTo(currentValues, changedValues);
      dispatch(updateField(name, append(text, items)));
    }
  };

  onSelectItem = (item) => {
    this.setState(({ selected }) => ({
      selected: this.isSelectedItem(item, selected) ? undefined : item,
      modalOpened: true,
    }));
  };

  isSelectedItem(item, selected) {
    const { type } = this.props;

    return selected && (type === 'strings' ? selected === item : selected.id === item.id);
  }

  render() {
    const {
      name,
      currentValues,
      changedValues,
      deletedValues,
      availableItems,
      availableItemsLoading,
      searchAvailableItems,
      placeholder,
      readOnly,
      addText,
      changeText,
      title1,
      title2,
      desc,
      alreadyAddedTitle,
      forbidEditCurrentItems,
      disableSelected,
      dispatch,
      type,
    } = this.props;

    const { modalOpened, selected } = this.state;

    return (
      <div
        className={cn('game-edit__select-items', {
          'game-edit__select-items__readonly': readOnly,
        })}
      >
        <div className="game-edit__select-items__container">
          <AddBtn
            className="game-edit__select-items__add-btn"
            readOnly={readOnly}
            onClick={this.onClickToAddBtn}
            text={addText}
          />
          <AddedItems
            type="select"
            dispatch={dispatch}
            name={name}
            currentValues={currentValues}
            changedValues={changedValues}
            deletedValues={deletedValues}
            selected={selected}
            placeholder={placeholder}
            forbidEditCurrentItems={forbidEditCurrentItems}
          />
        </div>
        {modalOpened && (
          <EditModal
            name={name}
            dispatch={dispatch}
            currentValues={currentValues}
            changedValues={changedValues}
            deletedValues={deletedValues}
            title1={title1}
            title2={title2}
            desc={desc}
            alreadyAddedTitle={alreadyAddedTitle}
            addText={addText}
            changeText={changeText}
            onClose={this.onCloseModal}
            onSaveItem={this.onSaveItem}
            selected={selected}
            availableItems={availableItems}
            availableItemsLoading={availableItemsLoading}
            searchAvailableItems={searchAvailableItems}
            placeholder={placeholder}
            forbidEditCurrentItems={forbidEditCurrentItems}
            disableSelected={disableSelected}
            type={type}
          />
        )}
      </div>
    );
  }
}

export default SelectItems;
