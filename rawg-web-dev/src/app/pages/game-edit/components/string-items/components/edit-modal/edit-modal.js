import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';

import { resetField } from 'app/pages/game-edit/actions/common';

import defaultTo from 'ramda/src/defaultTo';

import GameEditModal from 'app/pages/game-edit/components/modal';
import AddedItems from 'app/pages/game-edit/components/added-items';

import './edit-modal.styl';

@hot(module)
class EditModal extends React.Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
    dispatch: PropTypes.func.isRequired,
    currentValues: PropTypes.arrayOf(PropTypes.string).isRequired,
    changedValues: PropTypes.arrayOf(PropTypes.string),
    deletedValues: PropTypes.arrayOf(PropTypes.string).isRequired,
    title1: PropTypes.node.isRequired,
    title2: PropTypes.node,
    placeholder: PropTypes.node.isRequired,
    desc: PropTypes.node,
    addText: PropTypes.node.isRequired,
    changeText: PropTypes.node.isRequired,
    alreadyAddedTitle: PropTypes.node.isRequired,
    onClose: PropTypes.func.isRequired,
    onSelectItem: PropTypes.func.isRequired,
    selected: PropTypes.string,
    onSaveItem: PropTypes.func.isRequired,
  };

  static defaultProps = {
    desc: undefined,
    selected: undefined,
    changedValues: undefined,
  };

  constructor(props) {
    super(props);

    const { selected } = this.props;

    this.state = {
      prevSelected: selected,
      inputValue: selected || '',
    };
  }

  componentDidMount() {
    this.input.focus();
  }

  componentDidUpdate(previousProperties) {
    if (previousProperties.selected !== this.props.selected && this.props.selected) {
      this.input.focus();
    }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.selected !== state.prevSelected && props.selected) {
      return {
        prevSelected: props.selected,
        inputValue: props.selected,
      };
    }

    if (props.selected !== state.prevSelected && !props.selected) {
      return {
        prevSelected: props.selected,
        inputValue: '',
      };
    }

    return null;
  }

  onChangeInput = (event) => {
    this.setState({
      inputValue: event.target.value,
    });
  };

  onInputKeyDown = (event) => {
    if (event.key === 'Enter' && event.target.value) {
      this.saveItem(event.target.value);
    }
  };

  onAddClick = () => {
    this.saveItem(this.state.inputValue);
  };

  onCancelClick = () => {
    this.props.dispatch(resetField(this.props.name));
    this.props.onClose();
  };

  saveItem = (text) => {
    const { selected, currentValues, changedValues } = this.props;
    const items = defaultTo(currentValues, changedValues);

    if (text && (selected || !items.includes(text))) {
      this.props.onSaveItem(text);
      this.setState({ inputValue: '' });
    }
  };

  inputRef = (element) => {
    this.input = element;
  };

  render() {
    const {
      name,
      dispatch,
      title1,
      title2,
      onClose,
      onSelectItem,
      desc,
      addText,
      changeText,
      alreadyAddedTitle,
      currentValues,
      changedValues,
      deletedValues,
      selected,
      placeholder,
    } = this.props;

    const { inputValue } = this.state;

    return (
      <GameEditModal
        title1={title1}
        title2={title2}
        desc={desc}
        onClose={onClose}
        onSave={onClose}
        onCancel={this.onCancelClick}
      >
        <div className="game-edit__string-items__modal__input">
          <input
            type="text"
            value={inputValue}
            onChange={this.onChangeInput}
            onKeyDown={this.onInputKeyDown}
            ref={this.inputRef}
          />
          <div
            className="game-edit__string-items__modal__add-btn"
            onClick={this.onAddClick}
            role="button"
            tabIndex={0}
            disabled={!inputValue}
          >
            {selected ? changeText : addText}
          </div>
        </div>
        <div className="game-edit__string-items__modal__items-title">{alreadyAddedTitle}</div>
        <div className="game-edit__string-items__modal__items">
          <AddedItems
            type="string"
            name={name}
            dispatch={dispatch}
            currentValues={currentValues}
            changedValues={changedValues}
            deletedValues={deletedValues}
            onItemClick={onSelectItem}
            selected={selected}
            placeholder={placeholder}
          />
        </div>
      </GameEditModal>
    );
  }
}

export default EditModal;
