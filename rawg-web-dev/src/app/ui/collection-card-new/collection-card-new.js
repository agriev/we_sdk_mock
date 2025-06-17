/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import cn from 'classnames';

import nameSplit from 'tools/name-split';
import paths from 'config/paths';

import config from 'config/config';
import resize from 'tools/img/resize';

import ButtonFollow from 'app/ui/button-follow';

import { appSizeType } from 'app/pages/app/app.types';
import { toggleFollow } from 'app/pages/discover/discover.actions';

import Author from './components/author';
import MetaItem from './components/meta-item';
import InlineMode from './components/inline-mode';

import './collection-card-new.styl';

@hot
export default class CollectionCard extends Component {
  static propTypes = {
    collection: PropTypes.shape(),
    className: PropTypes.string,
    kind: PropTypes.oneOf(['block', 'inline', 'float']),
    size: appSizeType.isRequired,
    background: PropTypes.string,
    followingEnabled: PropTypes.bool,
    onFollowClick: PropTypes.func,
    dispatch: PropTypes.func,
  };

  static defaultProps = {
    collection: {},
    className: '',
    kind: undefined,
    background: undefined,
    followingEnabled: false,
    onFollowClick: undefined,
    dispatch: undefined,
  };

  getClassName() {
    const { className, kind } = this.props;

    return cn('collection-card-new', {
      [`collection-card-new_${kind}`]: kind,
      [className]: className,
    });
  }

  getGames() {
    const { collection } = this.props;
    const { game_covers } = collection;

    if (collection.games) {
      return collection.games;
    }

    if (game_covers) {
      return game_covers.map((bg, index) => ({
        ...bg,
        background_image: bg.url,
        title: '',
        id: `${bg.url}${index}`,
      }));
    }

    return [];
  }

  getContainerAttrs(games) {
    const { collection } = this.props;
    const { game_background: bg } = collection;
    const background = bg && bg.url ? bg : games[0];

    return {
      className: this.getClassName(),
      style: {
        backgroundImage:
          background && background.url
            ? `
          linear-gradient(to bottom, rgba(32,32,32,0.6), rgb(32,32,32) 50%),
          url('${resize(640, background.url)}')
        `
            : `
          linear-gradient(to bottom, rgba(32,32,32,0.8), rgb(32,32,32) 50%)
        `,
      },
    };
  }

  onFollowBtnClick = () => {
    const { dispatch, onFollowClick, collection } = this.props;

    if (onFollowClick) {
      onFollowClick(collection);
    } else if (dispatch) {
      toggleFollow(dispatch, collection, 'collection');
    }
  };

  renderMeta() {
    const { collection, size } = this.props;
    const { games_count, followers_count, likes_count } = collection;

    if (games_count === 0 && followers_count === 0) return null;

    return (
      <div className="collection-card-new__meta-list">
        <MetaItem description="collection.card_meta_amount_games" amount={games_count} size={size} />
        <MetaItem description="collection.card_meta_amount_cakes" amount={likes_count} size={size} />
        <MetaItem
          description="collection.card_meta_amount_followers"
          amount={followers_count}
          size={size}
          icon="user"
        />
      </div>
    );
  }

  renderTitle() {
    const { collection } = this.props;
    const { slug, name, noindex } = collection;

    return (
      <Link
        rel={noindex ? 'nofollow' : undefined}
        className="collection-card-new__link"
        to={paths.collection(slug)}
        href={paths.collection(slug)}
      >
        {nameSplit(name, 30)}
      </Link>
    );
  }

  renderAuthor() {
    const { collection } = this.props;
    const { avatar, full_name, username, slug } = collection.creator;

    return (
      <div className="collection-card-new__author">
        <span className="collection-card-new__author__collection-prefix">
          <FormattedMessage id="collection.collection" />
        </span>
        <span className="collection-card-new__author__prefix">
          <FormattedMessage id="collection.by" />
        </span>
        <Author username={username} slug={slug} avatar={avatar} full_name={full_name} profile={collection.creator} />
      </div>
    );
  }

  renderPrivateFlag() {
    const { collection } = this.props;
    const { is_private: isPrivate } = collection;

    if (!isPrivate) {
      return null;
    }

    return (
      <div className="collection-card-new__private">
        <FormattedMessage id="collection.is-private" />
      </div>
    );
  }

  renderFollowBtn() {
    const { followingEnabled, collection } = this.props;

    if (!followingEnabled) {
      return null;
    }

    return (
      <ButtonFollow
        className="collection-card-new__button-follow"
        following={collection.following}
        followLoading={collection.followLoading}
        onClick={this.onFollowBtnClick}
      />
    );
  }

  renderGames(games) {
    const { collection, kind } = this.props;
    const { slug, noindex } = collection;

    return (
      <Link
        rel={noindex ? 'nofollow' : undefined}
        className="collection-card-new__link collection-card-new__link_big"
        to={paths.collection(slug)}
        href={paths.collection(slug)}
      >
        {games.length !== 0 && (
          <div className="collection-card-new__games">
            {games.map((game, index) => (
              <div
                className={cn('collection-card-new__game', {
                  'collection-card-new__game_left': games.length === 3 && index === 0,
                  'collection-card-new__game_center': games.length === 3 && index === 1,
                  'collection-card-new__game_right': games.length === 3 && index === 2,
                  'collection-card-new__game_pair': games.length === 2,
                  'collection-card-new__game_single': games.length === 1,
                  'collection-card-new__game_float': kind === 'float',
                })}
                style={{
                  backgroundImage: game.background_image
                    ? `url(${game.background_image.replace('/media/', '/media/resize/420/-/')})`
                    : '',
                }}
                key={game.id}
              />
            ))}
          </div>
        )}
      </Link>
    );
  }

  renderInline() {
    const { collection, size, background } = this.props;
    const { avatar, slug: userslug } = collection.creator;
    const {
      slug,
      name,
      games_count,
      backgrounds,
      followers_count,
      noindex,
      likes_count,
      likes_positive,
      promo,
    } = collection;

    return (
      <InlineMode
        userslug={userslug}
        avatar={avatar}
        name={name}
        className={this.props.className}
        games_count={games_count}
        followers_count={followers_count}
        likes_count={likes_count}
        likes_positive={likes_positive}
        background={background}
        backgrounds={backgrounds}
        path={paths.collection(slug)}
        profile={collection.creator}
        size={size}
        promo={promo}
        noindex={noindex}
      />
    );
  }

  renderDefault() {
    const { collection } = this.props;
    const { promo } = collection;
    const games = this.getGames();
    const e3 = config.promos.e3 && promo === 'e3';
    const gc = config.promos.gamescom && promo === 'gamescom';

    return (
      <div {...this.getContainerAttrs(games)}>
        {e3 && <div className="collection-card-new__e3-2018-promo" />}
        {gc && <div className="collection-card-new__gamescom-promo" />}
        <div className="collection-card-new__meta">
          {this.renderTitle()}
          {this.renderAuthor()}
          {this.renderPrivateFlag()}
          {this.renderFollowBtn()}
          {this.renderMeta()}
        </div>
        {this.renderGames(games)}
      </div>
    );
  }

  render() {
    const { kind } = this.props;

    if (kind === 'inline') {
      return this.renderInline();
    }

    return this.renderDefault();
  }
}
