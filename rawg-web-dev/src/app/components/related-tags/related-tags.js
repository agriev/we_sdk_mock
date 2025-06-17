import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import { compose, withStateHandlers } from 'recompose';

import './related-tags.styl';

import take from 'lodash/take';
import paths from 'config/paths';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

const hoc = compose(
  withStateHandlers(
    { expanded: false },
    {
      toggle: ({ expanded }) => () => ({ expanded: !expanded }),
    },
  ),
);

const propTypes = {
  tags: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  expanded: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
};

const defaultProps = {};

const RelatedTagsComponent = ({ tags, expanded, toggle }) => {
  const tagsArray = expanded ? tags : take(tags, 8);

  if (tagsArray.length === 0) {
    return null;
  }

  return (
    <div className="related-tags">
      <div className="related-tags__title">
        <SimpleIntlMessage id="shared.related_tags" />
      </div>
      {tagsArray.map((tag) => (
        <Link to={paths.tag(tag.slug)} className="related-tags__item" key={tag.slug}>
          {tag.name}
        </Link>
      ))}
      {expanded ? (
        <div className="related-tags__rollup" role="button" tabIndex={0} onClick={toggle} />
      ) : (
        <div className="related-tags__expand" role="button" tabIndex={0} onClick={toggle} />
      )}
    </div>
  );
};

RelatedTagsComponent.propTypes = propTypes;
RelatedTagsComponent.defaultProps = defaultProps;

const RelatedTags = hoc(RelatedTagsComponent);

export default RelatedTags;
