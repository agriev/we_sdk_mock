import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import nl2br from 'react-nl2br';

import path from 'ramda/src/path';
import defaultTo from 'ramda/src/defaultTo';

import EditModal from './components/edit-modal';

import './textarea.styl';

@hot(module)
@injectIntl
@connect((state, props) => ({
  currentValue: path(['gameEdit', props.name, 'current'], state),
  changedValue: path(['gameEdit', props.name, 'changed'], state),
}))
class Textarea extends React.Component {
  static propTypes = {
    title1: PropTypes.node.isRequired,
    title2: PropTypes.node,
    name: PropTypes.string.isRequired,
    placeholder: PropTypes.node,
    currentValue: PropTypes.string,
    changedValue: PropTypes.string,
    dispatch: PropTypes.func.isRequired,
  };

  static defaultProps = {
    placeholder: '',
    currentValue: undefined,
    changedValue: undefined,
  };

  constructor(props) {
    super(props);

    this.state = {
      modalOpened: false,
    };
  }

  onCloseModal = () => {
    this.setState({ modalOpened: false });
  };

  onPreviewClick = () => {
    this.setState({ modalOpened: true });
  };

  render() {
    const { currentValue, changedValue, placeholder, name, dispatch, title1, title2 } = this.props;

    const { modalOpened } = this.state;
    const value = defaultTo(currentValue, changedValue) || '';

    return (
      <div className="game-edit__textarea">
        <div
          className="game-edit__textarea__preview-container"
          onClick={this.onPreviewClick}
          role="button"
          tabIndex={0}
        >
          <div className="game-edit__textarea__preview">
            {value && nl2br(value)}
            {!value && <div className="game-edit__textarea__preview_placeholder">{placeholder}</div>}
          </div>
          <div className="game-edit__textarea__preview-shadow" />
        </div>

        {modalOpened && (
          <EditModal
            title1={title1}
            title2={title2}
            currentValue={currentValue}
            changedValue={changedValue}
            onClose={this.onCloseModal}
            placeholder={placeholder}
            name={name}
            dispatch={dispatch}
          />
        )}
      </div>
    );
  }
}

export default Textarea;
