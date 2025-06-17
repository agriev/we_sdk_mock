import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';

import path from 'ramda/src/path';
import propEq from 'ramda/src/propEq';

import replaceOrAddByFunc from 'tools/ramda/replace-or-add-by-func';

import { updateField } from 'app/pages/game-edit/actions/common';

import AddBtn from 'app/pages/game-edit/components/add-btn';
import AddedItems from 'app/pages/game-edit/components/added-items';

import { ItemsTypes } from 'app/pages/game-edit/components/added-items/added-items.helper';

import ExtendedStringsEditModal from './components/edit-modal';

import './extended-string-items.styl';

@hot(module)
@connect((state, props) => ({
  currentValues: path(['gameEdit', props.name, 'current'], state),
  changedValues: path(['gameEdit', props.name, 'changed'], state),
  deletedValues: path(['gameEdit', props.name, 'deleted'], state),
}))
class ExtendedStringItems extends Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
    placeholder: PropTypes.node,
    currentValues: PropTypes.arrayOf(PropTypes.object),
    changedValues: PropTypes.arrayOf(PropTypes.object),
    deletedValues: PropTypes.arrayOf(PropTypes.number),
    availableItems: PropTypes.arrayOf(PropTypes.object),
    availableItemsLoading: PropTypes.bool,
    searchAvailableItems: PropTypes.func,
    readOnly: PropTypes.bool,
    addText: PropTypes.node,
    title1: PropTypes.node.isRequired,
    title2: PropTypes.node.isRequired,
    desc: PropTypes.node,
    alreadyAddedTitle: PropTypes.node,
    dispatch: PropTypes.func.isRequired,
    forbidEditCurrentItems: PropTypes.bool,
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
    alreadyAddedTitle: 'Already added',
    desc: undefined,
    forbidEditCurrentItems: false,
  };

  constructor(props) {
    super(props);

    this.state = {
      modalOpened: false,
      selected: null,
    };
  }

  onClickToAddBtn = () => {
    this.setState({ modalOpened: true });
  };

  onCloseModal = () => {
    this.setState({ modalOpened: false, selected: null });
  };

  onSaveItem = (item) => {
    const { name, dispatch, changedValues } = this.props;
    const newChangedItems = replaceOrAddByFunc(propEq('id', item.id), item, changedValues);

    dispatch(updateField(name, newChangedItems));
    this.setState({ selected: null });
  };

  onItemClick = (item) => {
    const { selected } = this.state;

    this.setState({
      selected: selected && selected.id === item.id ? null : item,
      modalOpened: true,
    });
  };

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
      title1,
      title2,
      desc,
      forbidEditCurrentItems,
      alreadyAddedTitle,
      dispatch,
    } = this.props;

    const { modalOpened, selected } = this.state;

    return (
      <div
        className={cn('game-edit__select-items', {
          'game-edit__select-items__readonly': readOnly,
        })}
      >
        <div className="game-edit__extended-string-items__container">
          <AddBtn
            className="game-edit__extended-string-items__add-btn"
            readOnly={readOnly}
            onClick={this.onClickToAddBtn}
            text={addText}
          />
          <AddedItems
            type={ItemsTypes.OBJECT}
            dispatch={dispatch}
            name={name}
            currentValues={currentValues}
            deletedValues={deletedValues}
            changedValues={changedValues}
            onSelectItem={this.onSelectItem}
            selected={selected}
            placeholder={placeholder}
            onItemClick={this.onItemClick}
            forbidEditCurrentItems={forbidEditCurrentItems}
          />
        </div>
        {modalOpened && (
          <ExtendedStringsEditModal
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
            onClose={this.onCloseModal}
            onSaveItem={this.onSaveItem}
            onSelectItem={this.onSelectItem}
            onItemClick={this.onItemClick}
            selected={selected}
            availableItems={availableItems}
            availableItemsLoading={availableItemsLoading}
            searchAvailableItems={searchAvailableItems}
            placeholder={placeholder}
            forbidEditCurrentItems={forbidEditCurrentItems}
          />
        )}
      </div>
    );
  }
}

export default ExtendedStringItems;
