import React, { useCallback } from 'react';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';

import appHelper from 'app/pages/app/app.helper';

import intlShape from 'tools/prop-types/intl-shape';

import paths from 'config/paths';
import { prepareDataToCardTemplate, isCreator } from 'app/components/card-template/card-template.lib';
import { toggleFollow } from 'app/pages/discover/discover.actions';
import { toSingularType } from 'tools/urls/entity-from-url';

import CardTemplate from 'app/components/card-template';

import SectionWrapper from '../section-wrapper';

const propTypes = {
  section: PropTypes.shape({
    name: PropTypes.string,
    slug: PropTypes.string,
    count: PropTypes.number,
    items: PropTypes.array,
  }).isRequired,
  appSize: PropTypes.string.isRequired,
  intl: intlShape.isRequired,
  dispatch: PropTypes.func.isRequired,
};

const prepareData = (slug, items, intl, isPhoneSize) =>
  items.slice(0, 8).map((item) =>
    prepareDataToCardTemplate({
      isPhoneSize,
      item,
      intl,
      collectionSlug: slug,
      kind: isCreator(slug) ? 'big' : 'medium',
      titleCentred: !isCreator(slug),
      withImage: isCreator(slug),
    }),
  );

const BrowseSectionComponent = ({ section, appSize, intl, dispatch }) => {
  const { name, slug, count } = section;
  const isPhoneSize = appHelper.isPhoneSize(appSize);
  const items = prepareData(slug, section.items, intl, isPhoneSize);

  if (items.length === 0) return null;

  const type = toSingularType(section.slug);
  const onFollowClick = useCallback((item) => toggleFollow(dispatch, item, type), [type]);

  return (
    <SectionWrapper
      section={{
        name,
        path: paths[slug],
        items: items.map((item, index) => (
          <CardTemplate
            key={item.id || index}
            image={item.image}
            backgroundImage={item.backgroundImage}
            heading={item.heading}
            headingNotice={item.headingNotice}
            itemsHeading={item.itemsHeading}
            items={item.items}
            kind={item.kind}
            withImage={item.withImage}
            item={item.item}
            following={item.item.following || false}
            followLoading={item.item.followLoading || false}
            onFollowClick={onFollowClick}
            flexibleHeight={isPhoneSize}
          />
        )),
        count,
      }}
      appSize={appSize}
    />
  );
};

BrowseSectionComponent.propTypes = propTypes;

const BrowseSection = injectIntl(BrowseSectionComponent);

export default BrowseSection;
