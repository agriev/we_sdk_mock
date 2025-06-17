import React from 'react';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';

import paths from 'config/paths';

import intlShape from 'tools/prop-types/intl-shape';

import CollectionCard from 'app/ui/collection-card-new';

import SectionWrapper from '../section-wrapper';

const propTypes = {
  section: PropTypes.shape({
    results: PropTypes.array,
    count: PropTypes.number,
  }).isRequired,
  intl: intlShape.isRequired,
  appSize: PropTypes.string.isRequired,
  dispatch: PropTypes.func.isRequired,
};

const CollectionsSectionComponent = (props) => {
  const {
    section: { results: items, count },
    appSize,
    intl,
    dispatch,
  } = props;

  if (items.length === 0) return null;

  return (
    <SectionWrapper
      section={{
        name: intl.formatMessage({ id: 'shared.header_collections' }),
        path: paths.collectionsPopular,
        items: items
          .slice(0, 8)
          .map((item) => (
            <CollectionCard
              followingEnabled
              dispatch={dispatch}
              size={appSize}
              kind="float"
              collection={item}
              key={item.id}
            />
          )),
        count,
      }}
      appSize={appSize}
    />
  );
};

CollectionsSectionComponent.propTypes = propTypes;

const CollectionsSection = injectIntl(CollectionsSectionComponent);

export default CollectionsSection;
