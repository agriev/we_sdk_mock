import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { FormattedMessage } from 'react-intl';
import ConfirmButton from 'app/ui/confirm-button/confirm-button';

import './confirm.styl';

export const confirmPropTypes = {
  onConfirm: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node,
};

const defaultProps = {
  onConfirm: undefined,
  children: undefined,
  className: '',
};

export default class Confirm extends Component {
  static propTypes = confirmPropTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.state = {
      showConfirm: false,
    };
  }

  getClassName() {
    const { className } = this.props;
    const { showConfirm } = this.state;

    return classnames('confirm', {
      'not-hover': showConfirm,
      [className]: className,
    });
  }

  showConfirm = () => {
    this.setState({ showConfirm: true });
  };

  hideConfirm = () => {
    this.setState({ showConfirm: false });
  };

  handleConfirm = () => {
    const { onConfirm } = this.props;

    if (typeof onConfirm === 'function') {
      onConfirm();
    }

    this.hideConfirm();
  };

  render() {
    const { showConfirm } = this.state;

    return (
      <div className={this.getClassName()}>
        {!showConfirm ? (
          <div className="confirm-title" onClick={this.showConfirm} role="button" tabIndex={0}>
            {this.props.children}
          </div>
        ) : (
          <div className="confirm-content">
            <div className="confirm-content__title">
              <FormattedMessage id="shared.confirm_title" />
            </div>
            <div className="confirm-content__buttons">
              <ConfirmButton isYes onClick={this.handleConfirm} />
              <ConfirmButton onClick={this.hideConfirm} />
            </div>
          </div>
        )}
      </div>
    );
  }
}
