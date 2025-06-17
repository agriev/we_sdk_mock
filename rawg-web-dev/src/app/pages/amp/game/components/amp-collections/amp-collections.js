import React from 'react';
import { pure } from 'recompose';
import { FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';
import SVGInline from 'react-svg-inline';

import paths from 'config/paths';
import arrowRight from 'assets/icons/arrow-right.svg';

import AmpCollectionCard from 'app/pages/amp/shared/amp-collection-card';

import { collections as collectionsType, slug as slugType } from 'app/pages/game/game.types';

const componentPropertyTypes = {
  collections: collectionsType,
  slug: slugType,
};

const componentDefaultProperties = {
  collections: {
    count: 0,
    results: [],
  },
  slug: '',
};

const GameCollectionsBlock = (props) => {
  const { slug, collections } = props;
  const { results, count } = collections;

  if (!Array.isArray(results) || results.length === 0) return null;

  const url = paths.gameCollections(slug);

  return (
    <div className="game__collections">
      <div className="game__block-title-and-count">
        <Link className="game__block-title" to={url} href={url}>
          <FormattedMessage id="game.in_collections" />
        </Link>
        <Link className="game__block-count" to={url} href={url}>
          <FormattedMessage id="game.collections_count" values={{ count }} />
        </Link>
      </div>
      {results.slice(0, 3).map((collection) => (
        <AmpCollectionCard collection={collection} kind="inline" key={collection.id} />
      ))}
      <Link className="game__view-all-link" to={url} href={url}>
        View all
        <SVGInline className="game__view-all-icon" svg={arrowRight} />
      </Link>
    </div>
  );
};

GameCollectionsBlock.propTypes = componentPropertyTypes;
GameCollectionsBlock.defaultProps = componentDefaultProperties;

export default pure(GameCollectionsBlock);
