import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';
import cn from 'classnames';
import { Link } from 'app/components/link';
import { FormattedDate } from 'react-intl';

import noop from 'lodash/noop';

import len from 'tools/array/len';
import getAppContainerWidth from 'tools/get-app-container-width';

import './calendar-months.styl';

const hoc = compose(hot);

const propTypes = {
  dates: PropTypes.arrayOf(
    PropTypes.shape({
      year: PropTypes.number,
      month: PropTypes.number,
    }),
  ),
  activeMonth: PropTypes.number,
  activeYear: PropTypes.number,
  onClick: PropTypes.func,
  showLinks: PropTypes.bool,
  urlBase: PropTypes.string,
};

const defaultProps = {
  activeMonth: undefined,
  activeYear: undefined,
  showLinks: false,
  urlBase: undefined,
  onClick: noop,
};

const CalendarMonthsComponent = ({ dates, activeMonth, activeYear, onClick, showLinks, urlBase }) => {
  const container = useRef(null);

  useEffect(() => {
    if (!container.current) return;

    const activeMonthElement = container.current.querySelector('.calendar__month_active');
    const offsetLeft = activeMonthElement ? activeMonthElement.getBoundingClientRect().left : 0;
    const { offsetWidth } = container.current;

    container.current.scrollLeft = offsetLeft > getAppContainerWidth() / 2 ? offsetWidth : 0;
  }, [activeMonth, len(dates)]);

  if (!dates || len(dates) === 0) return null;

  const MonthTag = showLinks ? Link : 'div';

  // eslint-disable-next-line react/prop-types
  const renderMonth = ({ month, year }) => {
    const className = cn('calendar__month', {
      calendar__month_active: month === activeMonth && year === activeYear,
    });

    return (
      <MonthTag
        className={className}
        onClick={() => onClick({ month, year })}
        key={`${month}.${year}`}
        to={showLinks ? `${urlBase}/${year}-${month}` : undefined}
        role="button"
        tabIndex={0}
      >
        <FormattedDate value={new Date(year, month - 1, 1)} month="short" />
      </MonthTag>
    );
  };

  return (
    <div className="calendar__months">
      <div ref={container} className="calendar__months-items">
        {dates.map(renderMonth)}
      </div>
    </div>
  );
};

CalendarMonthsComponent.propTypes = propTypes;
CalendarMonthsComponent.defaultProps = defaultProps;

const CalendarMonths = hoc(CalendarMonthsComponent);

export default CalendarMonths;
