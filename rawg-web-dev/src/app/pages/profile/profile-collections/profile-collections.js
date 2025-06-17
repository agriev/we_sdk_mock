import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link, withRouter } from 'react-router';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import paths from 'config/paths';

import prepare from 'tools/hocs/prepare';
import { return404IfEmptyPage } from 'app/pages/app/app.actions';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import Tabs from 'app/ui/tabs';
import Tab from 'app/ui/tabs/tab';
import Button from 'app/ui/button';
import CollectionCardsList from 'app/ui/collection-cards-list';
import CollectionCard from 'app/ui/collection-card-new';
import LoadMore from 'app/ui/load-more';
import EmptyList from 'app/ui/empty-list';

import './profile-collections.styl';

import locationShape from 'tools/prop-types/location-shape';
import { currentUserIdType } from 'app/components/current-user/current-user.types';
import { appSizeType } from 'app/pages/app/app.types';

import { loadProfileCollectionsCreated, loadProfileCollectionsFollowing } from '../profile.actions';

@prepare(
  async ({ store, params = {} }) => {
    const { id } = params;

    await Promise.allSettled([
      store.dispatch(loadProfileCollectionsCreated(id, 1)),
      store.dispatch(loadProfileCollectionsFollowing(id, 1)),
    ]).then((r) => return404IfEmptyPage(store.dispatch)(r.values));
  },
  {
    updateParam: 'id',
    loading: false,
  },
)
@connect((state) => ({
  currentUserId: state.currentUser.id,
  profile: state.profile,
  size: state.app.size,
}))
@withRouter
export default class ProfileCollections extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    params: PropTypes.shape({
      id: PropTypes.string,
      tab: PropTypes.string,
    }).isRequired,
    profile: PropTypes.shape().isRequired,
    currentUserId: currentUserIdType.isRequired,
    size: appSizeType.isRequired,
    location: locationShape.isRequired,
  };

  static defaultProps = {};

  load = () => {
    const {
      dispatch,
      params: { id, tab },
      profile,
    } = this.props;
    const { collectionsCreated, collectionsFollowing } = profile;

    switch (tab) {
      case 'created':
        return dispatch(loadProfileCollectionsCreated(id, collectionsCreated.next));
      case 'following':
        return dispatch(loadProfileCollectionsFollowing(id, collectionsFollowing.next));
      default:
        return undefined;
    }
  };

  isActiveTab(tabPathname) {
    const { pathname } = this.props.location;

    return tabPathname === pathname;
  }

  isCurrentUser() {
    const { currentUserId, profile } = this.props;

    return currentUserId === profile.user.id;
  }

  renderTabs() {
    const { params, currentUserId, profile } = this.props;
    const { id, tab } = params;
    const { collectionsCreated, collectionsFollowing } = profile;

    const isMineNonEmptyCollectionsPage =
      currentUserId === profile.user.id && tab === 'created' && Boolean(collectionsCreated.count);

    const createCollectionLink = (className) => (
      <Link
        className={cn('profile-collections__tabs__new_collection_link', className)}
        to={paths.collectionCreate}
        href={paths.collectionCreate}
      >
        <FormattedMessage id="profile.tab_collections_start_new" />
      </Link>
    );

    return (
      <div className="profile-collections__tabs">
        {isMineNonEmptyCollectionsPage && createCollectionLink('non-visible')}
        <Tabs className="profile-collections__tabs-inner" centred={false}>
          <Tab
            to={paths.profileCollectionsCreated(id)}
            rel={collectionsCreated.count === 0 ? 'nofollow' : undefined}
            size="small"
            counter={collectionsCreated.count}
            active={this.isActiveTab(paths.profileCollectionsCreated(id))}
          >
            <FormattedMessage
              id={`profile.tab_collections_${currentUserId === profile.user.id ? 'personal_' : ''}created`}
            />
          </Tab>
          <Tab
            rel={collectionsFollowing.count === 0 ? 'nofollow' : undefined}
            to={paths.profileCollectionsFollowing(id)}
            size="small"
            counter={collectionsFollowing.count}
            active={this.isActiveTab(paths.profileCollectionsFollowing(id))}
          >
            <FormattedMessage id="profile.tab_collections_following" />
          </Tab>
        </Tabs>
        {isMineNonEmptyCollectionsPage && createCollectionLink()}
      </div>
    );
  }

  renderEmptyCreated() {
    const message = this.isCurrentUser() ? (
      <>
        <SimpleIntlMessage id="profile.empty_collections_personal_created" />
        <Link
          key="link"
          to={paths.collectionCreate}
          href={paths.collectionCreate}
          className="profile-collections__empty_link"
        >
          <Button kind="fill" size="medium">
            <SimpleIntlMessage id="profile.empty_collections_personal_created_link" />
          </Button>
        </Link>
      </>
    ) : (
      <SimpleIntlMessage id="profile.empty_collections_created" />
    );

    return <EmptyList message={message} />;
  }

  renderEmptyFollowing() {
    const message = this.isCurrentUser() ? (
      <FormattedMessage
        id="profile.empty_collections_personal_following"
        values={{
          link1: (
            <Link to={paths.index}>
              <FormattedMessage id="profile.empty_collections_personal_following_link_1" />
            </Link>
          ),
        }}
      />
    ) : (
      <SimpleIntlMessage id="profile.empty_collections_following" />
    );

    return <EmptyList message={message} />;
  }

  renderEmptyCollectionsPage() {
    const {
      params: { tab },
    } = this.props;

    switch (tab) {
      case 'created':
        return this.renderEmptyCreated();
      case 'following':
        return this.renderEmptyFollowing();
      default:
        return null;
    }
  }

  renderCollections() {
    const {
      params: { tab },
      profile,
      size,
    } = this.props;
    const { collectionsCreated, collectionsFollowing } = profile;

    const collectionsMap = {
      created: collectionsCreated,
      following: collectionsFollowing,
    };

    const collections = collectionsMap[tab] || {};

    const { count, next, loading, results } = collections;

    if (!loading && !count) {
      return this.renderEmptyCollectionsPage();
    }

    return (
      <LoadMore appSize={size} load={this.load} count={count} next={next} loading={loading}>
        <CollectionCardsList>
          {results.map((collection) => (
            <CollectionCard size={size} type="phone" collection={collection} key={collection.id} />
          ))}
        </CollectionCardsList>
      </LoadMore>
    );
  }

  render() {
    return (
      <div className="profile-connections">
        {this.renderTabs()}
        {this.renderCollections()}
      </div>
    );
  }
}
