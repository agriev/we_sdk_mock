import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';

import { resetField, updateField } from 'app/pages/game-edit/actions/common';

import GameEditModal from 'app/pages/game-edit/components/modal';
import defaultTo from 'ramda/src/defaultTo';

import './edit-modal.styl';

@hot(module)
class EditModal extends React.Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
    dispatch: PropTypes.func.isRequired,
    currentValue: PropTypes.string,
    changedValue: PropTypes.string,
    title1: PropTypes.node.isRequired,
    title2: PropTypes.node,
    placeholder: PropTypes.node.isRequired,
    desc: PropTypes.node,
    onClose: PropTypes.func.isRequired,
  };

  static defaultProps = {
    desc: undefined,
    currentValue: undefined,
    changedValue: undefined,
  };

  componentDidMount() {
    this.textarea.focus();
    this.textarea.setSelectionRange(0, 0);
    this.textarea.scrollTop = 0;
  }

  onCancelClick = () => {
    this.props.dispatch(resetField(this.props.name));
    this.props.onClose();
  };

  onChange = (event) => {
    this.props.dispatch(updateField(this.props.name, event.target.value));
  };

  inputTextarea = (element) => {
    this.textarea = element;
  };

  render() {
    const { name, title1, title2, onClose, desc, currentValue, changedValue, placeholder } = this.props;

    const value = defaultTo(currentValue, changedValue) || '';

    return (
      <GameEditModal
        title1={title1}
        title2={title2}
        desc={desc}
        onClose={onClose}
        onSave={onClose}
        onCancel={this.onCancelClick}
      >
        <textarea
          className="game-edit__textarea__modal__textarea"
          ref={this.inputTextarea}
          name={name}
          value={value}
          onChange={this.onChange}
          placeholder={placeholder}
        />
      </GameEditModal>
    );
  }
}

export default EditModal;
