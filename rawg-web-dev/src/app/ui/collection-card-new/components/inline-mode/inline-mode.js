/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import range from 'lodash/range';

import Author from 'app/ui/collection-card-new/components/author';
import { appSizeType } from 'app/pages/app/app.types';
import config from 'config/config';

import MetaItem from '../meta-item';

const componentPropertyTypes = {
  userslug: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  avatar: PropTypes.string,
  profile: PropTypes.shape().isRequired,
  followers_count: PropTypes.number,
  games_count: PropTypes.number,
  likes_count: PropTypes.number,
  // likes_positive: PropTypes.number,
  backgrounds: PropTypes.arrayOf(PropTypes.shape()),
  background: PropTypes.string,
  path: PropTypes.string.isRequired,
  className: PropTypes.string,
  promo: PropTypes.string,
  size: appSizeType.isRequired,
  noindex: PropTypes.bool,
};

const defaultProps = {
  backgrounds: undefined,
  background: undefined,
  followers_count: undefined,
  games_count: undefined,
  likes_count: undefined,
  // likes_positive: undefined,
  className: '',
  promo: '',
  avatar: undefined,
  noindex: false,
};

const InlineMode = ({
  userslug,
  avatar,
  name,
  followers_count,
  likes_count,
  // likes_positive,
  backgrounds,
  background,
  path,
  profile,
  games_count,
  size,
  className,
  promo,
  noindex,
}) => {
  const e3 = config.promos.e3 && promo === 'e3';
  const gc = config.promos.gamescom && promo === 'gamescom';
  // let likesIcon;
  // if (likes_positive) {
  //   likesIcon = 'upvote';
  // } else if (likes_count !== 0) {
  //   likesIcon = 'downvote';
  // }

  return (
    <div className={['collection-card-new__inline-container', className].join(' ')}>
      {background && (
        <div
          className="collection-card-new__inline__background"
          style={{
            backgroundImage: `url(${background})`,
          }}
        />
      )}
      {background && <div className="collection-card-new__inline__obscurer" />}

      <Link className="collection-card-new__inline-images" to={path} href={path} rel={noindex ? 'nofollow' : undefined}>
        {Array.isArray(backgrounds) &&
          backgrounds.map((backgroundItem) => (
            <div
              className="collection-card-new__game-small"
              style={{
                backgroundImage: backgroundItem.url
                  ? `url(${backgroundItem.url.replace('/media/', '/media/resize/200/-/')})`
                  : '',
              }}
              key={backgroundItem.url}
            />
          ))}
        {Array.isArray(backgrounds) &&
          range(Math.max(0, 4 - backgrounds.length)).map((index) => (
            <div className="collection-card-new__game-small" key={index} />
          ))}
      </Link>
      <div className="collection-card-new__title-inline">
        <div className="collection-card-new__title-inline-wrap">
          <Link
            className="collection-card-new__title-link-inline"
            to={path}
            href={path}
            rel={noindex ? 'nofollow' : undefined}
          >
            {name}
            {e3 && <div className="collection-card-new__e3-2018-promo-inline" />}
            {gc && <div className="collection-card-new__gamescom-promo-inline" />}
          </Link>
          <div className="collection-card-new__author collection-card-new__author_inline">
            by&nbsp;
            <Author
              username={profile.username}
              slug={userslug}
              avatar={avatar}
              full_name={profile.full_name}
              profile={profile}
            />
          </div>
        </div>
        <div className="collection-card-new__meta-list-item-container">
          <MetaItem amount={games_count} description="collection.card_meta_amount_games" alignRight size={size} />
          <MetaItem amount={likes_count} description="collection.card_meta_amount_cakes" alignRight size={size} />
          <MetaItem
            amount={followers_count}
            description="collection.card_meta_amount_followers"
            alignRight
            size={size}
          />
          {/* <MetaItem
            isPositive={likes_positive}
            amount={likes_count}
            description="collection.card_meta_amount_votes"
            icon={likesIcon}
            alignRight
            size={size}
          /> */}
        </div>
      </div>
    </div>
  );
};

InlineMode.propTypes = componentPropertyTypes;
InlineMode.defaultProps = defaultProps;

export default InlineMode;
