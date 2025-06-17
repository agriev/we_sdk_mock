/* eslint-disable camelcase */

import React, { useCallback } from 'react';
import { Link } from 'app/components/link';
import PropTypes from 'prop-types';

import './collection-buttons.styl';

import get from 'lodash/get';

import Button from 'app/ui/button';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import DiscoverSharing from 'app/ui/discover-sharing';
import CollectionLikeButton from 'app/pages/collection/components/like-button';
import ButtonFollow from 'app/ui/button-follow/button-follow';

import paths from 'config/paths';
import currentUserType from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';

import { unfollowCollection, followCollection } from 'app/pages/collection/collection.actions';
import checkLogin from 'tools/check-login';

const propTypes = {
  currentUser: currentUserType.isRequired,
  location: locationShape.isRequired,
  collection: PropTypes.shape().isRequired,
  dispatch: PropTypes.func.isRequired,
  showLikeButton: PropTypes.bool,
  likeButtonProperties: PropTypes.object,
};

const defaultProps = {
  showLikeButton: false,
};

const CollectionButtons = ({
  dispatch,
  currentUser,
  location,
  showLikeButton,
  likeButtonProperties,
  collection = {},
}) => {
  const { slug, following, follow_loading, creator = {} } = collection;
  const { pathname } = location;
  const isUserCollection = get(currentUser, 'id') === creator.id;

  const editButton = () => (
    <Link key="edit-btn" to={paths.collectionEdit(slug)}>
      <Button className="collection-buttons__button" kind="fill" size="medium">
        <SimpleIntlMessage id="collection.edit" />
      </Button>
    </Link>
  );

  const followButton = () => {
    const unfollow = useCallback(() => dispatch(unfollowCollection(collection)));
    const follow = useCallback(() => checkLogin(dispatch, () => dispatch(followCollection(collection))));

    return (
      <ButtonFollow
        key="follow-btn"
        className="collection-buttons__follow-btn"
        following={following}
        followLoading={follow_loading}
        onClick={following ? unfollow : follow}
      />
    );
  };

  const likeButton = () => {
    if (showLikeButton) {
      return <CollectionLikeButton key="like-button" {...likeButtonProperties} />;
    }

    return null;
  };

  const addGamesButton = () => (
    <Link key="add-games-btn" to={paths.collectionAddGames(slug)}>
      <Button className="collection-buttons__button" kind="fill" size="medium">
        <SimpleIntlMessage id="collection.add_card" />
      </Button>
    </Link>
  );

  return (
    <div className="collection-buttons">
      <div className="collection-buttons__controls">
        {isUserCollection ? [likeButton(), addGamesButton(), editButton()] : [likeButton(), followButton()]}
        <DiscoverSharing url={pathname} />
      </div>
    </div>
  );
};

CollectionButtons.propTypes = propTypes;

CollectionButtons.defaultProps = defaultProps;

export default CollectionButtons;
