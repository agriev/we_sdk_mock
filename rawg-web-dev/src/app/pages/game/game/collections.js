import React from 'react';
import { pure, compose } from 'recompose';
import PropTypes from 'prop-types';
import { injectIntl } from 'react-intl';

import SectionHeading from 'app/ui/section-heading';

import paths from 'config/paths';

import CollectionCard from 'app/ui/collection-card';
import ViewAllButton from 'app/ui/view-all-link';

import { collections as collectionsType, slug as slugType } from 'app/pages/game/game.types';
import intlShape from 'tools/prop-types/intl-shape';

const hoc = compose(
  pure,
  injectIntl,
);

const componentPropertyTypes = {
  collections: collectionsType,
  slug: slugType,
  name: PropTypes.string.isRequired,
  intl: intlShape.isRequired,
};

const componentDefaultProperties = {
  collections: {
    count: 0,
    results: [],
  },
  slug: '',
};

const GameCollectionsBlockComponent = ({ slug, collections, name, intl }) => {
  const { results, count } = collections;

  if (!Array.isArray(results) || results.length === 0) return null;

  const url = paths.gameCollections(slug);

  return (
    <div className="game__collections">
      <SectionHeading
        url={url}
        heading={intl.formatMessage({ id: 'game.collections_title' }, { name })}
        count={intl.formatMessage({ id: 'game.collections_count' }, { count })}
      />
      {results.slice(0, 3).map((collection) => (
        <CollectionCard collection={collection} kind="inline" key={collection.id} />
      ))}
      <ViewAllButton path={url} />
    </div>
  );
};

GameCollectionsBlockComponent.propTypes = componentPropertyTypes;
GameCollectionsBlockComponent.defaultProps = componentDefaultProperties;

const GameCollectionsBlock = hoc(GameCollectionsBlockComponent);

export default GameCollectionsBlock;
