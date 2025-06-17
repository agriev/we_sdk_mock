import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import cn from 'classnames';
import path from 'ramda/src/path';
import defaultTo from 'ramda/src/defaultTo';
import { injectIntl } from 'react-intl';

import intlShape from 'tools/prop-types/intl-shape';

import './input.styl';

import { updateField } from 'app/pages/game-edit/actions/common';
import { updateGameInfo } from 'app/pages/game-edit/actions/basic';

import FieldStatus from '../field-status';

const componentPropertyTypes = {
  name: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  currentValue: PropTypes.string,
  changedValue: PropTypes.string,
  readOnly: PropTypes.bool,
  className: PropTypes.string,
  changedMessageId: PropTypes.string,
  dispatch: PropTypes.func.isRequired,
  intl: intlShape.isRequired,
  error: PropTypes.string,
};

const defaultProps = {
  placeholder: '',
  currentValue: '',
  changedValue: undefined,
  readOnly: false,
  className: '',
  changedMessageId: '',
  error: '',
};
@injectIntl
@connect((state, props) => ({
  currentValue: path(['gameEdit', props.name, 'current'], state),
  changedValue: path(['gameEdit', props.name, 'changed'], state),
}))
class Input extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    const { currentValue, changedValue } = this.props;

    this.state = {
      showMessage: false,
      messageShowEnabled: false,
      oldValue: defaultTo(currentValue, changedValue),
      value: defaultTo(currentValue, changedValue) || '',
    };
  }

  static getDerivedStateFromProps(props, state) {
    const { currentValue, changedValue } = props;
    const newValue = defaultTo(currentValue, changedValue);

    if (newValue !== state.value && state.oldValue !== newValue) {
      return {
        value: newValue,
      };
    }

    return null;
  }

  onChange = (event) => {
    const { name, dispatch } = this.props;
    const { target } = event;

    this.setState(
      ({ value }) => ({
        showMessage: true,
        value: target.value,
        oldValue: value,
      }),
      () => {
        dispatch(updateField(name, target.value));
      },
    );
  };

  onBlur = () => {
    this.setState({ showMessage: false });
  };

  onKeyDown = (event) => {
    if (event.key === 'Enter') {
      const { dispatch } = this.props;

      dispatch(updateGameInfo());
    }
  };

  render() {
    const { name, currentValue, placeholder, readOnly, className, changedMessageId, intl, error } = this.props;
    const { showMessage, messageShowEnabled } = this.state;
    const changed = this.state.value !== currentValue;

    return (
      <div className={cn('game-edit__input', className)}>
        <input
          className={cn({ 'game-edit__input_changed': changed }, className)}
          name={name}
          value={this.state.value}
          onChange={this.onChange}
          onBlur={this.onBlur}
          onKeyDown={this.onKeyDown}
          placeholder={intl.formatMessage({ id: placeholder })}
          readOnly={readOnly}
        />
        {messageShowEnabled && showMessage && changed && (
          <FieldStatus message={{ messageID: changedMessageId }} error={error} />
        )}
      </div>
    );
  }
}

Input.defaultProps = defaultProps;

export default Input;
