import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';
import cn from 'classnames';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import './confirm-button.styl';

const hoc = compose(hot(module));

const componentPropertyTypes = {
  className: PropTypes.string,
  isYes: PropTypes.bool,
  onClick: PropTypes.func,
};

const defaultProps = {
  className: '',
  isYes: false,
  onClick: () => {},
};

const ConfirmButtonComponent = ({ className, isYes, onClick }) =>
  isYes ? (
    <div
      className={cn('confirm-button__button', 'confirm-button__button_y', className)}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <SimpleIntlMessage id="shared.confirm_y" />
    </div>
  ) : (
    <div
      className={cn('confirm-button__button', 'confirm-button__button_n', className)}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <SimpleIntlMessage id="shared.confirm_n" />
    </div>
  );

ConfirmButtonComponent.propTypes = componentPropertyTypes;
ConfirmButtonComponent.defaultProps = defaultProps;

const ConfirmButton = hoc(ConfirmButtonComponent);

export default ConfirmButton;
