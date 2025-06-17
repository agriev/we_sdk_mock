import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';

import prepare from 'tools/hocs/prepare';
import { return404IfEmptyPage } from 'app/pages/app/app.actions';
import { loadProfileConnectionsFollowing, loadProfileConnectionsFollowers } from 'app/pages/profile/profile.actions';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import LoadMore from 'app/ui/load-more';
import UserCardsList from 'app/ui/user-cards-list';
import UserCard from 'app/ui/user-card';
import EmptyList from 'app/ui/empty-list';

import './profile-connections.styl';

import currentUserType from 'app/components/current-user/current-user.types';
import { appSizeType } from 'app/pages/app/app.types';

@prepare(
  async ({ store, params = {} }) => {
    const { id, tab } = params;
    const handleActionsForCheck = ([followingAction, followersAction]) =>
      return404IfEmptyPage(store.dispatch)([tab === 'following' ? followingAction : followersAction]);

    await Promise.allSettled([
      store.dispatch(loadProfileConnectionsFollowing(id, 1)),
      store.dispatch(loadProfileConnectionsFollowers(id, 1)),
    ]).then((r) => handleActionsForCheck(r.values));
  },
  {
    updateParam: 'id',
    loading: false,
  },
)
@connect((state) => ({
  currentUser: state.currentUser,
  profile: state.profile,
  appSize: state.app.size,
}))
export default class ProfileConnections extends Component {
  static propTypes = {
    appSize: appSizeType.isRequired,
    currentUser: currentUserType.isRequired,
    dispatch: PropTypes.func.isRequired,
    params: PropTypes.shape().isRequired,
    profile: PropTypes.shape().isRequired,
  };

  getEmptyMessage() {
    const {
      params: { tab },
    } = this.props;

    if (tab === 'following') {
      return this.isCurrentUser() ? (
        <FormattedMessage id="profile.empty_connections_personal_following" />
      ) : (
        <SimpleIntlMessage id="profile.empty_connections_following" />
      );
    }

    return <SimpleIntlMessage id="profile.empty_connections_followers" />;
  }

  load = () => {
    const {
      dispatch,
      params: { id, tab },
      profile,
    } = this.props;
    const { connectionsFollowing, connectionsFollowers } = profile;

    switch (tab) {
      case 'following':
        return dispatch(loadProfileConnectionsFollowing(id, connectionsFollowing.next));
      case 'followers':
        return dispatch(loadProfileConnectionsFollowers(id, connectionsFollowers.next));
      default:
        return undefined;
    }
  };

  isCurrentUser() {
    const { currentUser, profile } = this.props;

    return currentUser.id === profile.user.id;
  }

  renderEmpty = () => <EmptyList message={this.getEmptyMessage()} />;

  renderUsers() {
    const {
      params: { tab },
      profile,
      appSize,
    } = this.props;
    const { connectionsFollowing, connectionsFollowers } = profile;

    const users = tab === 'following' ? connectionsFollowing : connectionsFollowers;

    const { count, next, loading, results } = users;

    if (!loading && !count) {
      return this.renderEmpty();
    }

    return (
      <LoadMore appSize={appSize} load={this.load} count={count} next={next} loading={loading}>
        <UserCardsList>
          {results.map((user) => (
            <UserCard user={user} key={user.id} />
          ))}
        </UserCardsList>
      </LoadMore>
    );
  }

  render() {
    return <div className="profile-connections">{this.renderUsers()}</div>;
  }
}
