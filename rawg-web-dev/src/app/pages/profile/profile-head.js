/* eslint-disable camelcase, react/no-danger */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link, withRouter } from 'react-router';
import classnames from 'classnames';
import SVGInline from 'react-svg-inline';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import { hot } from 'react-hot-loader/root';

import shareIcon from 'assets/icons/share.svg';
import checkIcon from 'assets/icons/check.svg';

import checkLogin from 'tools/check-login';
import len from 'tools/array/len';

import { appSizeType } from 'app/pages/app/app.types';
import locationShape from 'tools/prop-types/location-shape';
import currentUserType from 'app/components/current-user/current-user.types';

import Heading from 'app/ui/heading';

import Tabs from 'app/ui/tabs';
import Tab from 'app/ui/tabs/tab';
import Button from 'app/ui/button';
import Avatar from 'app/ui/avatar';
import Dropdown from 'app/ui/dropdown';
import Sharing from 'app/components/sharing';
import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';

import './profile-head.styl';
import { followUser, unfollowUser } from './profile.actions';

export const profileHeadPropTypes = {
  profileUser: currentUserType,
  params: PropTypes.shape({
    id: PropTypes.string,
  }),
  className: PropTypes.string,
  dispatch: PropTypes.func.isRequired,
  currentUser: currentUserType.isRequired,
  user: PropTypes.shape({}),
  currentUserId: PropTypes.number.isRequired,
  size: appSizeType.isRequired,
  location: locationShape.isRequired,
};

const profileHeadDefaultProperties = {
  profileUser: {},
  params: {
    id: 0,
  },
  className: '',
  user: undefined,
};

@hot
@connect((state) => ({
  currentUser: state.currentUser,
  size: state.app.size,
}))
@withRouter
export default class ProfileHead extends Component {
  static propTypes = profileHeadPropTypes;

  static defaultProps = profileHeadDefaultProperties;

  constructor(props, context) {
    super(props, context);

    this.state = {
      sharingOpen: false,
    };
  }

  get className() {
    const { className } = this.props;

    return classnames('profile-head', {
      [className]: className,
    });
  }

  follow = () => {
    const { dispatch, profileUser } = this.props;

    checkLogin(dispatch, () => {
      dispatch(followUser(profileUser));
    });
  };

  unfollow = () => {
    const { dispatch, profileUser } = this.props;

    dispatch(unfollowUser(profileUser));
  };

  openSharing = () => {
    this.setState({ sharingOpen: true });
  };

  closeSharing = () => {
    this.setState({ sharingOpen: false });
  };

  isActiveTab(tabPathnames) {
    const { pathname } = this.props.location;

    return tabPathnames.some((tabPathname) => tabPathname === pathname);
  }

  renderAvatar() {
    const { profileUser = {}, user = {} } = this.props;
    const { avatar = '' } = len(profileUser.username) > 0 ? profileUser : user;

    if (profileUser.username.length === 0) {
      return null;
    }

    return <Avatar className="profile-head__avatar" size={86} src={avatar} profile={profileUser} />;
  }

  renderDesktop() {
    const { profileUser = {}, user = {} } = this.props;
    const { full_name = '', username } = profileUser.username.length > 0 ? profileUser : user;

    // Разбиваем на слова чтобы пересобрать вместе с аватаркой
    const name = appHelper.getName({ full_name, username });
    const nameWords = name.split(' ');

    if (nameWords.length === 1) {
      return (
        <div key={name} className="profile-head__name__single-word">
          <div className="profile-head__name__single-word__name">{name}</div>
          {this.renderAvatar()}
        </div>
      );
    }

    // Собираем слова поблочно, последнее слово объединяем с аватаркой запрещая перенос
    return nameWords.map((word, index) =>
      index === nameWords.length - 1 ? (
        <div key={word} className="profile-head__name__last-word">
          {word}
          {this.renderAvatar()}
        </div>
      ) : (
        <div key={word} className="profile-head__name__word">
          {word}
        </div>
      ),
    );
  }

  renderName() {
    const { profileUser = {}, user = {}, size } = this.props;
    const { full_name = '', username } = profileUser.username.length > 0 ? profileUser : user;
    const name = appHelper.getName({ full_name, username });

    return (
      <div className="profile-head__name-wrapper">
        <Heading className="profile-head__name" rank={1}>
          {appHelper.isDesktopSize({ size }) ? (
            this.renderDesktop()
          ) : (
            <span>
              {this.renderAvatar()}
              {name}
            </span>
          )}
        </Heading>
      </div>
    );
  }

  renderButtons() {
    const { currentUser, profileUser = {} } = this.props;
    const { following, follow_loading, followers_count, slug } = profileUser || {};
    const { sharingOpen } = this.state;

    const url = paths.profile(slug);

    const sharingOpenButton = (
      <Button className="profile-head__share-button" kind="fill" size="medium" onClick={this.openSharing}>
        <SVGInline svg={shareIcon} className="profile-head__share-icon" />
      </Button>
    );

    const sharingOpenContent = (
      <div className="profile-head__share-content">
        <div className="profile-head__share-title">
          <SimpleIntlMessage id="profile.share_title" />
        </div>
        <div onClick={this.closeSharing} role="button" tabIndex={0}>
          <Sharing className="profile-head__share-item" provider="vk" url={url}>
            VK
          </Sharing>
        </div>
        {/* <div onClick={this.closeSharing} role="button" tabIndex={0}>
          <Sharing className="profile-head__share-item" provider="twitter" url={url}>
            Twitter
          </Sharing>
        </div> */}
      </div>
    );

    return (
      <div className="profile-head__buttons">
        {/* {currentUser.id && currentUser.id === profileUser.id ? ( */}
        {/*  <Link to={paths.settings} href={paths.settings}> */}
        {/*    <Button className="profile-head__button" kind="fill" size="medium"> */}
        {/*      <SimpleIntlMessage id="profile.settings" /> */}
        {/*    </Button> */}
        {/*  </Link> */}
        {/* ) : ( */}
        {/*  null */}
        {/* )} */}
        {currentUser.id && currentUser.id !== profileUser.id && (
          <Button
            className="profile-head__button"
            kind="fill"
            size="medium"
            disabled={follow_loading}
            loading={follow_loading}
            onClick={following ? this.unfollow : this.follow}
          >
            <SimpleIntlMessage id={`profile.${following ? 'following' : 'follow'}`} />
            {following ? (
              <SVGInline svg={checkIcon} className="profile-head__button-icon" />
            ) : (
              <span className="button__additional">{followers_count || ''}</span>
            )}
          </Button>
        )}
        <Dropdown
          opened={sharingOpen}
          kind="sharing"
          onClose={this.closeSharing}
          renderedButton={sharingOpenButton}
          renderedContent={sharingOpenContent}
        />
      </div>
    );
  }

  renderTabs() {
    const { params = {}, profileUser, currentUserId } = this.props;
    const { id = 0 } = params;
    const {
      games_count,
      games_wishlist_count,
      collections_count,
      reviews_count,
      followers_count,
      following_count,
    } = profileUser;

    const showCounter = currentUserId !== profileUser.id && games_count > 0;

    return (
      <div className="profile-head__tabs">
        <Tabs className="profile-head__tabs-inner" centred={false}>
          <Tab to={paths.profile(id)} counter={0} active={this.isActiveTab([paths.profile(id)])} isNoRel>
            <SimpleIntlMessage id="profile.overview" />
          </Tab>
          <Tab
            to={paths.profileGames(id)}
            counter={showCounter ? games_count - games_wishlist_count : 0}
            active={this.isActiveTab([paths.profileGames(id)])}
          >
            <SimpleIntlMessage id="profile.games" />
          </Tab>
          <Tab
            to={paths.profileGamesToPlay(id)}
            counter={showCounter ? games_wishlist_count : 0}
            active={this.isActiveTab([paths.profileGamesToPlay(id)])}
          >
            <SimpleIntlMessage id="profile.tab_to_play" />
          </Tab>
          <Tab
            to={paths.profileReviews(id)}
            counter={showCounter ? reviews_count : 0}
            active={this.isActiveTab([paths.profileReviews(id)])}
          >
            <SimpleIntlMessage id="profile.reviews" />
          </Tab>
          <Tab
            to={paths.profileCollectionsCreated(id)}
            counter={showCounter ? collections_count : 0}
            active={this.isActiveTab([paths.profileCollectionsCreated(id), paths.profileCollectionsFollowing(id)])}
          >
            <SimpleIntlMessage id="profile.collections" />
          </Tab>
          <Tab
            to={paths.profileConnectionsFollowing(id)}
            counter={showCounter ? following_count : 0}
            active={this.isActiveTab([paths.profileConnectionsFollowing(id)])}
          >
            <SimpleIntlMessage id="profile.tab_connections_following" />
          </Tab>
          <Tab
            to={paths.profileConnectionsFollowers(id)}
            counter={showCounter ? followers_count : 0}
            active={this.isActiveTab([paths.profileConnectionsFollowers(id)])}
          >
            <SimpleIntlMessage id="profile.tab_connections_followers" />
          </Tab>
        </Tabs>
      </div>
    );
  }

  render() {
    const { profileUser = {}, user = {} } = this.props;
    const { bio } = profileUser.username.length > 0 ? profileUser : user;

    return (
      <div className={this.className}>
        <div className="profile-head__top">
          {this.renderName()}
          <div className="profile-head__controls">{this.renderButtons()}</div>
        </div>
        {bio && (
          <div
            className="profile-head__bio"
            dangerouslySetInnerHTML={{
              __html: bio,
            }}
          />
        )}
        {this.renderTabs()}
      </div>
    );
  }
}
