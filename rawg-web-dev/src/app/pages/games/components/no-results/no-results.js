import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';

import paths from 'config/paths';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import './no-results.styl';

const propTypes = {
  className: PropTypes.string,
  addClearFilterLink: PropTypes.bool,
  clearFitlerPath: PropTypes.string,
};

const defaultProps = {
  className: '',
  addClearFilterLink: true,
  clearFitlerPath: paths.games,
};

const NoResults = ({ className, addClearFilterLink, clearFitlerPath }) => (
  <div className={['no-results', className].join(' ')}>
    <div className="no-results__icon" />
    <div className="no-results__text">
      {addClearFilterLink && (
        <FormattedMessage
          id="games.no-results__clear-filter"
          values={{
            link: (
              <Link to={clearFitlerPath} className="no-results__link">
                <SimpleIntlMessage id="games.clear-filters" />
              </Link>
            ),
          }}
        />
      )}
      {!addClearFilterLink && <FormattedMessage id="games.no-results" />}
    </div>
  </div>
);

NoResults.propTypes = propTypes;
NoResults.defaultProps = defaultProps;

export default NoResults;
