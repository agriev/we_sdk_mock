import React from 'react';
import PropTypes from 'prop-types';

import get from 'lodash/get';

import paths from 'config/paths';

import getSiteUrl from 'tools/get-site-url';

import gameType from 'app/pages/game/game.types';
import { appLocaleType } from 'app/pages/app/app.types';

import { AggregateRating } from 'app/pages/game/game.helper';

const propTypes = {
  review: PropTypes.shape().isRequired,
  game: gameType.isRequired,
  rating: PropTypes.shape().isRequired,
  user: PropTypes.shape().isRequired,
  semantics: PropTypes.string.isRequired,
  appLocale: appLocaleType.isRequired,
};

const defaultProps = {};

const ReviewCardMeta = ({ review, game, user, rating, semantics, appLocale }) => {
  const siteUrl = getSiteUrl(appLocale);

  return (
    <>
      <meta itemProp="datePublished" content={review.created} />
      <meta itemProp="url" content={`${siteUrl}${paths.review(review.id)}`} />
      {semantics === 'full' && game && (
        <div itemScope itemProp="itemReviewed" itemType="http://schema.org/VideoGame">
          <meta itemProp="name" content={game.name} />
          <meta itemProp="applicationCategory" content="game" />
          <meta itemProp="sameAs" content={`${siteUrl}${paths.game(game.slug)}`} />
          <AggregateRating game={game} />
        </div>
      )}
      <div itemType="http://schema.org/Rating" itemProp="reviewRating" itemScope>
        <meta itemProp="worstRating" content="2" />
        <meta itemProp="bestRating" content="5" />
        <meta itemProp="ratingValue" content={rating.id <= 1 ? 2 : rating.id} />
      </div>
      <div itemType="http://schema.org/Person" itemProp="author" itemScope>
        {user && <meta itemProp="sameAs" content={`${siteUrl}${paths.profile(user.slug)}`} />}
        <meta itemProp="name" content={get(user, 'full_name') || get(user, 'username') || review.external_author} />
      </div>
    </>
  );
};

ReviewCardMeta.propTypes = propTypes;
ReviewCardMeta.defaultProps = defaultProps;

export default ReviewCardMeta;
