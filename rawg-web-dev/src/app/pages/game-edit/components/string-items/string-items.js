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

import './string-items.styl';

@hot(module)
@connect((state, props) => ({
  currentValues: path(['gameEdit', props.name, 'current'], state),
  changedValues: path(['gameEdit', props.name, 'changed'], state),
  deletedValues: path(['gameEdit', props.name, 'deleted'], state),
}))
class StringItems extends React.Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
    placeholder: PropTypes.node,
    currentValues: PropTypes.arrayOf(PropTypes.string),
    changedValues: PropTypes.arrayOf(PropTypes.string),
    deletedValues: PropTypes.arrayOf(PropTypes.string),
    readOnly: PropTypes.bool,
    addText: PropTypes.node,
    changeText: PropTypes.node,
    title1: PropTypes.node.isRequired,
    title2: PropTypes.node,
    desc: PropTypes.node,
    alreadyAddedTitle: PropTypes.node,
    dispatch: PropTypes.func.isRequired,
  };

  static defaultProps = {
    currentValues: [],
    changedValues: undefined,
    deletedValues: [],
    readOnly: false,
    placeholder: 'Add some items',
    addText: 'Add',
    changeText: 'Change',
    alreadyAddedTitle: 'Already added',
    desc: undefined,
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
    const items = defaultTo(currentValues, changedValues);

    if (selected) {
      const idx = items.indexOf(selected);
      dispatch(updateField(name, update(idx, text, items)));
      dispatch(unmarkValueDeleted(name, selected));

      this.setState({ selected: undefined });
    } else {
      dispatch(updateField(name, append(text, items)));
    }
  };

  onSelectItem = (item) => {
    this.setState(({ selected }) => ({
      selected: selected === item ? undefined : item,
      modalOpened: true,
    }));
  };

  render() {
    const {
      name,
      currentValues,
      changedValues,
      deletedValues,
      placeholder,
      readOnly,
      addText,
      changeText,
      title1,
      title2,
      desc,
      alreadyAddedTitle,
      dispatch,
    } = this.props;

    const { modalOpened, selected } = this.state;

    return (
      <div
        className={cn('game-edit__string-items', {
          'game-edit__string-items__readonly': readOnly,
        })}
      >
        <div className="game-edit__string-items__container">
          <AddBtn
            className="game-edit__string-items__add-btn"
            readOnly={readOnly}
            onClick={this.onClickToAddBtn}
            text={addText}
          />
          <AddedItems
            type="string"
            dispatch={dispatch}
            name={name}
            currentValues={currentValues}
            changedValues={changedValues}
            deletedValues={deletedValues}
            onItemClick={this.onSelectItem}
            selected={selected}
            placeholder={placeholder}
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
            onSelectItem={this.onSelectItem}
            selected={selected}
            placeholder={placeholder}
          />
        )}
      </div>
    );
  }
}

export default StringItems;
