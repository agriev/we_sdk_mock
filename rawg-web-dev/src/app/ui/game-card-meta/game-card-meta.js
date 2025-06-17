import React from 'react';

import paths from 'config/paths';
import gameType from 'app/pages/game/game.types';

const propTypes = {
  game: gameType.isRequired,
};

const defaultProps = {};

const GameCardMeta = ({ game }) => (
  <>
    <meta itemProp="name" content={game.name} />
    <meta itemProp="url" content={paths.game(game.slug)} />
    <meta itemProp="category" content="Full Game" />
    <meta itemProp="applicationCategory" content="Game" />
    {game.rating_top > 0 && (
      <div itemProp="aggregateRating" itemScope itemType="http://schema.org/AggregateRating">
        <meta itemProp="author" content="RAWG" />
        <meta itemProp="worstRating" content="2" />
        <meta itemProp="bestRating" content="5" />
        <meta itemProp="ratingValue" content={game.rating_top <= 1 ? 2 : game.rating_top} />
        {game.ratings_count > 0 && <meta itemProp="ratingCount" content={game.ratings_count} />}
        {game.reviews_text_count > 0 && <meta itemProp="reviewCount" content={game.reviews_text_count} />}
      </div>
    )}
  </>
);

GameCardMeta.propTypes = propTypes;
GameCardMeta.defaultProps = defaultProps;

export default GameCardMeta;
