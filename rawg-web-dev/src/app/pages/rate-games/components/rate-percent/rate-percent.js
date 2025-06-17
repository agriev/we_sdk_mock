import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';
import { FormattedMessage } from 'react-intl';

import RoundProgressbar from 'app/ui/round-progressbar';

import './rate-percent.styl';

const hoc = compose(hot(module));

const componentPropertyTypes = {
  className: PropTypes.string,
  percent: PropTypes.number,
  withText: PropTypes.bool,
};

const defaultProps = {
  className: '',
  percent: 0,
  withText: true,
};

const RatePercentComponent = ({ className, percent, withText }) => (
  <div className={['rate-percent', className].join(' ')}>
    <RoundProgressbar percent={percent} squareSize={24} strokeWidth={3} className="rate-percent__progress" />
    {withText && (
      <FormattedMessage
        id="profile.rate_games_percent"
        values={{
          percent: <span className="rate-percent__percent">{percent}%</span>,
        }}
      />
    )}
  </div>
);

RatePercentComponent.propTypes = componentPropertyTypes;
RatePercentComponent.defaultProps = defaultProps;

const RatePercent = hoc(RatePercentComponent);

export default RatePercent;
