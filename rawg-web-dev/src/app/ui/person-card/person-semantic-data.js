import React from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';

import { appLocaleType } from 'app/pages/app/app.types';

import paths from 'config/paths';
import getSiteUrl from 'tools/get-site-url';

const calcSemanticAttributes = (person, semantic) => {
  const positions = get(person, 'positions', []).map((pos) => pos.slug);
  const attributes = {
    itemScope: true,
    itemType: 'http://schema.org/Person',
  };

  if (semantic === 'gamepage') {
    if (positions.includes('director')) {
      attributes.itemProp = 'director';
    } else if (positions.includes('producer')) {
      attributes.itemProp = 'producer';
    } else if (positions.includes('composer')) {
      attributes.itemProp = 'musicBy';
    } else {
      attributes.itemProp = 'creator';
    }
  }

  return attributes;
};

const componentPropertyTypes = {
  semantic: PropTypes.oneOf(['gamepage', 'standalone']),
  person: PropTypes.shape({
    image: PropTypes.string,
    name: PropTypes.string,
    slug: PropTypes.string,
  }).isRequired,
  appLocale: appLocaleType.isRequired,
};

const defaultProps = {
  semantic: 'standalone',
};

const PersonSemanticData = ({ person, semantic, appLocale }) => (
  <div {...calcSemanticAttributes(person, semantic)}>
    {person.image && <meta itemProp="image" content={person.image} />}
    <meta itemProp="name" content={person.name} />
    <meta itemProp="url" content={`${getSiteUrl(appLocale)}${paths.creator(person.slug)}`} />
  </div>
);

PersonSemanticData.propTypes = componentPropertyTypes;
PersonSemanticData.defaultProps = defaultProps;

export default PersonSemanticData;
