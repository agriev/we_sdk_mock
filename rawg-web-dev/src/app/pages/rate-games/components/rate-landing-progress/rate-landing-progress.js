import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import isFinite from 'lodash/isFinite';

// import RateLandingShare from '../rate-landing-share';
import RatePercent from '../rate-percent';
import RateLandingShare from '../rate-landing-share';

import './rate-landing-progress.styl';

const propTypes = {
  games: PropTypes.shape({
    results: PropTypes.array.isRequired,
    count: PropTypes.number,
    total_games: PropTypes.number,
  }).isRequired,
};

const RateLandingProgress = ({ games }) => {
  const { count, total_games: total } = games;
  const countElement = <span className="rate-landing-progress__count">{count}</span>;
  if (!total) return null;

  return (
    <div className="rate-landing-progress">
      <div className="rate-landing-progress__rated">
        {isFinite(count) && <RatePercent percent={count} withText={false} />}
        <FormattedMessage id="rate_games.rated_text" values={{ count: countElement, total }} />
      </div>
      <RateLandingShare className="rate-landing-progress__share" />
    </div>
  );
};

RateLandingProgress.propTypes = propTypes;

export default RateLandingProgress;
