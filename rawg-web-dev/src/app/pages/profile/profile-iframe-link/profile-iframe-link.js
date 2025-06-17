import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { dispatchCustomEvent } from '../../../../tools/dispatch-custom-event';
import { TOGGLE_PROFILE_IFRAME_VISIBILITY } from '../../app/app.actions';
import config from '../../../../config/config';

const propTypes = {
  className: PropTypes.string,
  title: PropTypes.string,
  children: PropTypes.shape(),
};

const defaultProps = {
  className: '',
  title: '',
};

const ProfileIframeLink = ({ className, title, children }) => {
  const openUserIframeHandler = useCallback((e) => {
    e.preventDefault();
    dispatchCustomEvent({
      el: document,
      eventName: TOGGLE_PROFILE_IFRAME_VISIBILITY,
      detail: {
        state: config.authLink,
      },
    });
  }, []);

  return (
    <a role="button" href="#" className={className} onClick={openUserIframeHandler}>
      {title}
      {children}
    </a>
  );
};

ProfileIframeLink.propTypes = propTypes;
ProfileIframeLink.defaultProps = defaultProps;

export default ProfileIframeLink;
