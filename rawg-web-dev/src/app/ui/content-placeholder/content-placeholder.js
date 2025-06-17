import React from 'react';
import PropTypes from 'prop-types';

import range from 'lodash/range';

import './content-placeholder.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  rows: PropTypes.number,
  rowHeight: PropTypes.number,
  isTitle: PropTypes.bool,
};

const defaultProps = {
  className: '',
  rows: 5,
  rowHeight: 10,
  isTitle: true,
};

const ContentPlaceholder = ({ className, rows, rowHeight, isTitle }) => (
  <div className={['content-placeholder', className].join(' ')}>
    {isTitle && <div className="content-placeholder__title" />}
    {[...range(0, rows)].map((element, index /* eslint-disable react/no-array-index-key */) => (
      <div className="content-placeholder__row" style={{ height: rowHeight }} key={index} />
    ))}
  </div>
);

ContentPlaceholder.propTypes = componentPropertyTypes;
ContentPlaceholder.defaultProps = defaultProps;

export default ContentPlaceholder;
