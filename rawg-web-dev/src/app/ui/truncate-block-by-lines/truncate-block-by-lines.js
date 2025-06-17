import React, { useState } from 'react';
import PropTypes from 'prop-types';
import TextTruncate from 'react-text-truncate';
import { Link } from 'app/components/link';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';

import unescape from 'lodash/unescape';

import defaultTo from 'ramda/src/defaultTo';

import './truncate-block-by-lines.styl';

import UserContent from 'app/ui/user-content';
import trans from 'tools/trans';

const hoc = compose(hot);

const propTypes = {
  text: PropTypes.string,
  lines: PropTypes.number,
  className: PropTypes.string,
  expanded: PropTypes.bool,
  onShowMoreClick: PropTypes.func,
  showMoreUrl: PropTypes.string,
  showMoreText: PropTypes.node,
  showLessText: PropTypes.node,
};

const defaultProps = {
  text: '',
  lines: 6,
  className: undefined,
  expanded: undefined,
  onShowMoreClick: undefined,
  showMoreUrl: undefined,
  showMoreText: trans('shared.show_more'),
  showLessText: trans('shared.show_less'),
};

const TruncateBlockByLinesComponent = ({
  className,
  text,
  expanded: expandedProperty,
  showMoreUrl,
  onShowMoreClick,
  showMoreText,
  showLessText,
  lines,
}) => {
  if (!text) {
    return null;
  }

  const [expandedState, setExpanded] = useState(undefined);
  const expanded = defaultTo(expandedProperty, expandedState);
  const toggleExpanded = () => setExpanded(!expanded);
  const ShowMoreTag = showMoreUrl ? Link : 'span';
  const onClick = showMoreUrl ? undefined : onShowMoreClick || toggleExpanded;

  const toggleButton = (
    <ShowMoreTag
      className={expanded ? 'truncate-text-2__less' : 'truncate-text-2__more'}
      onClick={onClick}
      to={showMoreUrl}
      role={showMoreUrl ? undefined : 'button'}
      tabIndex={showMoreUrl ? undefined : 0}
    >
      {expanded ? showLessText : showMoreText}
    </ShowMoreTag>
  );

  if (expanded) {
    return (
      <>
        <UserContent className={className} content={text} />
        {toggleButton}
      </>
    );
  }

  return (
    <TextTruncate
      containerClassName={className}
      line={Math.max(1, lines)}
      truncateText="…"
      text={unescape(text.replace(/<\/?[^>]+(>|$)/g, ' '))}
      textTruncateChild={toggleButton}
    />
  );
};

TruncateBlockByLinesComponent.propTypes = propTypes;
TruncateBlockByLinesComponent.defaultProps = defaultProps;

const TruncateBlockByLines = hoc(TruncateBlockByLinesComponent);

export default TruncateBlockByLines;
