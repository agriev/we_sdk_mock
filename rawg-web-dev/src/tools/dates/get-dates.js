import range from 'lodash/range';

import map from 'ramda/src/map';

import getCurrentYear from 'tools/dates/current-year';
import getPreviousYear from 'tools/dates/previous-year';
import getCurrentMonth from 'tools/dates/current-month';

const makeDateFromMonths = (year) =>
  map((month) => ({
    month,
    year,
  }));

export const getDatesWithPreviousYear = () => {
  const month = getCurrentMonth();
  const makeCurrentYearDates = makeDateFromMonths(getCurrentYear());
  const makePreviousYearDates = makeDateFromMonths(getPreviousYear());

  if (month < 5) {
    const previousYearDates = makePreviousYearDates(range(4 + month, 13));
    const currentYearDates = makeCurrentYearDates(range(1, month + 1));
    return [...previousYearDates, ...currentYearDates];
  }

  return makeCurrentYearDates(range(1, month + 1));
};

export const getDatesWithNextYear = () => {
  const year = getCurrentYear();
  const month = getCurrentMonth();
  const makeCurrentYearDates = makeDateFromMonths(year);

  if (month > 6) {
    const makeNextYearDates = makeDateFromMonths(year + 1);
    const nextYearDates = makeNextYearDates(range(1, 17 - month));
    const currentYearDates = makeCurrentYearDates(range(1, 13));
    return [...currentYearDates, ...nextYearDates];
  }

  return makeCurrentYearDates(range(1, 13));
};
