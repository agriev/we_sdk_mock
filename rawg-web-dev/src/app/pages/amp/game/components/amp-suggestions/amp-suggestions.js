import React from 'react';
import { pure } from 'recompose';
import { FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';
import SVGInline from 'react-svg-inline';

import arrowRight from 'assets/icons/arrow-right.svg';
import paths from 'config/paths';
import AmpGameCardInline from 'app/pages/amp/shared/amp-game-card-inline';

import { suggestions as suggestionsType, slug as slugType } from 'app/pages/game/game.types';

const componentPropertyTypes = {
  suggestions: suggestionsType,
  slug: slugType,
};

const componentDefaultProperties = {
  suggestions: {
    count: 0,
    results: [],
  },
  slug: '',
};

const AmpSuggestions = ({ slug, suggestions }) => {
  const { results, count } = suggestions;

  if (!Array.isArray(results) || results.length === 0) return null;

  const url = paths.gameSuggestions(slug);

  return (
    <div className="game__suggestions">
      <div className="game__block-title-and-count">
        <Link className="game__block-title" to={url} href={url}>
          <FormattedMessage id="game.suggestions" />
        </Link>
        <Link className="game__block-count" to={url} href={url}>
          <FormattedMessage id="game.suggestions_count" values={{ count }} />
        </Link>
      </div>
      <div className="game-card_inline-container">
        {results.slice(0, 3).map((game) => (
          <AmpGameCardInline game={game} key={game.id} />
        ))}
      </div>
      <Link className="game__view-all-link" to={url} href={url}>
        View all
        <SVGInline className="game__view-all-icon" svg={arrowRight} />
      </Link>
    </div>
  );
};

AmpSuggestions.propTypes = componentPropertyTypes;
AmpSuggestions.defaultProps = componentDefaultProperties;

export default pure(AmpSuggestions);
