import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import './no-results.styl';

const propTypes = {
  className: PropTypes.string,
};

const defaultProps = {
  className: '',
};

const NoResults = ({ className }) => (
  <div className={['no-results', className].join(' ')}>
    <div className="no-results__icon" />
    <div className="no-results__text">
      <FormattedMessage id="games.no-results" />
    </div>
  </div>
);

NoResults.propTypes = propTypes;
NoResults.defaultProps = defaultProps;

export default NoResults;
