import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import currentUserType from 'app/components/current-user/current-user.types';
import paths from 'config/paths';
import Sharing from 'app/components/sharing';

import './sharing.styl';

@connect((state) => ({
  currentUser: state.currentUser,
  profile: state.profile,
}))
export default class ProfileSharing extends Component {
  static propTypes = {
    currentUser: currentUserType.isRequired,
    profile: PropTypes.shape().isRequired,
  };

  render() {
    const { currentUser, profile } = this.props;

    if (currentUser.id !== profile.user.id) return null;

    const url = paths.profile(profile.user.slug);

    return (
      <div className="profile-sharing">
        <div className="profile-sharing__separator" />
        <div className="profile-sharing__info">
          <div className="profile-sharing__image" />
          <div className="profile-sharing__text">
            <div className="profile-sharing__title">
              <SimpleIntlMessage id="profile.overview_sharing_title" />
            </div>
            <div className="profile-sharing__description">
              <SimpleIntlMessage id="profile.overview_sharing_description" />
            </div>
            <div className="profile-sharing__buttons">
              <Sharing className="profile-sharing__button profile-sharing__button_vk" provider="vk" url={url}>
                VK
              </Sharing>

              {/* <Sharing className="profile-sharing__button profile-sharing__button_tw" provider="twitter" url={url}>
                Twitter
              </Sharing> */}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
