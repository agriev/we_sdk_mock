import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import paths from 'config/paths';
import { dispatchCustomEvent } from 'tools/dispatch-custom-event';
import { TOGGLE_PROFILE_IFRAME_VISIBILITY } from 'app/pages/app/app.actions';
import config from '../../../../../../config/config';

const propTypes = {
  className: PropTypes.string,
};

const defaultProps = {
  className: '',
};

const GuestSessionLinks = ({ className }) => {
  const openUserIframeHandler = (isRegister) => (e) => {
    e.preventDefault();
    dispatchCustomEvent({
      el: document,
      eventName: TOGGLE_PROFILE_IFRAME_VISIBILITY,
      detail: {
        state: !isRegister ? config.authLink : config.registerLink,
      },
    });
  };

  return (
    <>
      <span className={className} onClick={openUserIframeHandler(false)} role="button" tabIndex={0}>
        <FormattedMessage id="shared.header_log_in" />
      </span>

      <span className={className} onClick={openUserIframeHandler(true)} role="button" tabIndex={0}>
        <FormattedMessage id="shared.header_sign_up" />
      </span>
    </>
  );
};

GuestSessionLinks.propTypes = propTypes;
GuestSessionLinks.defaultProps = defaultProps;

export default GuestSessionLinks;
