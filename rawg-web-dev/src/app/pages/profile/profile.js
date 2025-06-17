/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import startsWith from 'lodash/startsWith';

import prepare from 'tools/hocs/prepare';

import { getBackgroundArt } from 'app/pages/profile/profile.helpers';

import { currentUserIdType } from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import ProfileHead from './profile-head';
import { loadProfile, resetProfileState } from './profile.actions';

import './profile.styl';

@hot
@prepare(
  async ({ store, params = {} }) => {
    const { id } = params;

    await Promise.allSettled([store.dispatch(resetProfileState()), store.dispatch(loadProfile(id))]);
  },
  {
    updateParam: 'id',
  },
)
@injectIntl
@connect((state) => ({
  profileUser: state.profile.user,
  currentUserId: state.currentUser.id,
  firstPage: state.app.firstPage,
}))
export default class Profile extends React.Component {
  static propTypes = {
    intl: intlShape.isRequired,
    location: locationShape.isRequired,
    params: PropTypes.shape().isRequired,
    profileUser: PropTypes.shape().isRequired,
    children: PropTypes.node,
    currentUserId: currentUserIdType.isRequired,
    firstPage: PropTypes.bool.isRequired,
  };

  static defaultProps = {
    children: undefined,
  };

  constructor(props, context) {
    super(props, context);

    this.getBackgroundArt = getBackgroundArt();
  }

  componentDidMount() {
    if (!this.props.firstPage) {
      window.scrollTo(0, 0);
    }
  }

  componentDidUpdate(previousProperties) {
    const profile = this.props.profileUser;
    const previousProfile = previousProperties.profileUser;

    if (previousProfile.id && previousProfile.id !== profile.id) {
      window.scrollTo(0, 0);
    }
  }

  render() {
    const { intl, location, profileUser, params, currentUserId } = this.props;
    const { game_background, username, bio } = profileUser;
    const currentPath =
      `${location.pathname
        .split('/')
        .filter((p) => !startsWith(p, '@'))
        .join('/')}` || '/overview';

    if (currentPath.includes('developer') || currentPath.includes('apikey')) {
      return this.props.children;
    }

    return (
      <Page
        helmet={{
          title: intl.formatMessage(
            {
              id: `profile.head_title_${currentPath}`,
            },
            { name: username },
          ),
          description: bio,
          image: profileUser.game_background ? profileUser.game_background.url : profileUser.avatar,
          none:
            profileUser.noindex ||
            location.query.filter /* because back returns noindex field */ ||
            (currentPath.includes('collections') && profileUser.collections_count === 0),
        }}
        art={this.getBackgroundArt(game_background)}
        className={location.pathname.includes('overview') ? 'profile profile_overview' : 'profile'}
        sidebarProperties={{
          onlyOnPhone: false,
        }}
      >
        <div className="profile-content-wrap">
          <Content className="profile" columns="1">
            <ProfileHead
              currentUserId={currentUserId}
              className="profile__head"
              user={location.state}
              profileUser={profileUser}
              params={params}
            />
            <div className="profile__content">{this.props.children}</div>
          </Content>
        </div>
      </Page>
    );
  }
}
