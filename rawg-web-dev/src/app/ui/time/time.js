import PropTypes from 'prop-types';
import { onlyUpdateForKeys, compose } from 'recompose';
import { injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader';

import intlShape from 'tools/prop-types/intl-shape';

const hoc = compose(
  hot(module),
  injectIntl,
  onlyUpdateForKeys(['date']),
);

const componentPropertyTypes = {
  date: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  intl: intlShape.isRequired,
  relative: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
};

const defaultProps = {
  relative: false,
};

const TimeComponent = ({ date, relative = false, format, intl }) => {
  const eventDate = new Date(date || Date.now());
  const daysForRelative = relative * 24 * 60 * 60 * 1000;

  if (relative && Date.now() - eventDate.getTime() < daysForRelative) {
    const difference = Date.now() - eventDate.getTime();
    const minutes = Math.ceil(difference / 1000 / 60);
    const hours = Math.ceil(difference / 1000 / 60 / 60);
    const days = Math.ceil(difference / 1000 / 60 / 60 / 24);

    if (minutes < 60) {
      return intl.formatRelativeTime(-minutes, 'minutes');
    }

    if (hours < 24) {
      return intl.formatRelativeTime(-hours, 'hours');
    }

    return intl.formatRelativeTime(-days, 'day', { numeric: 'auto' });
  }

  return intl.formatDate(eventDate, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...format,
  });
};

TimeComponent.propTypes = componentPropertyTypes;
TimeComponent.defaultProps = defaultProps;

const Time = hoc(TimeComponent);

export default Time;
