import React from 'react';

import paths from 'config/paths';
import config from 'config/config';

import LabeledIconLink from '../labeled-icon-link';
import { dispatchCustomEvent } from '../../../../../../../tools/dispatch-custom-event';
import { TOGGLE_PROFILE_IFRAME_VISIBILITY } from '../../../../../../pages/app/app.actions';

const PhoneGuestIcons = () => {
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
      <LabeledIconLink
        path="#"
        onClick={openUserIframeHandler(false)}
        intlId="header.log_in"
        iconClassName="header__log-in-mobile-icon"
      />
      <LabeledIconLink
        path="#"
        onClick={openUserIframeHandler(true)}
        intlId="header.sign_up"
        iconClassName="header__sign-up-mobile-icon"
      />
    </>
  );
};

export default PhoneGuestIcons;
