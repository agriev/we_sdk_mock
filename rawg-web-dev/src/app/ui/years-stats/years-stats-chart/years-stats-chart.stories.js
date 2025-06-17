import React from 'react';

import { storiesOf } from '@storybook/react';

import YearsStatsChart from './years-stats-chart';

const props = {
  id: 'antonovm',
  stats: {
    timeline: [
      {
        year: 1979,
        count: 0,
        decade: true,
      },
      {
        year: 1980,
        count: 0,
        decade: false,
      },
      {
        year: 1981,
        count: 0,
        decade: false,
      },
      {
        year: 1982,
        count: 0,
        decade: false,
      },
      {
        year: 1983,
        count: 0,
        decade: false,
      },
      {
        year: 1984,
        count: 0,
        decade: false,
      },
      {
        year: 1985,
        count: 0,
        decade: false,
      },
      {
        year: 1986,
        count: 0,
        decade: false,
      },
      {
        year: 1987,
        count: 0,
        decade: false,
      },
      {
        year: 1988,
        count: 0,
        decade: false,
      },
      {
        year: 1989,
        count: 0,
        decade: false,
      },
      {
        year: 1990,
        count: 0,
        decade: true,
      },
      {
        year: 1991,
        count: 0,
        decade: false,
      },
      {
        year: 1992,
        count: 0,
        decade: false,
      },
      {
        year: 1993,
        count: 0,
        decade: false,
      },
      {
        year: 1994,
        count: 0,
        decade: false,
      },
      {
        year: 1995,
        count: 0,
        decade: false,
      },
      {
        year: 1996,
        count: 0,
        decade: false,
      },
      {
        year: 1997,
        count: 0,
        decade: false,
      },
      {
        year: 1998,
        count: 0,
        decade: false,
      },
      {
        year: 1999,
        count: 0,
        decade: false,
      },
      {
        year: 2000,
        count: 0,
        decade: true,
      },
      {
        year: 2001,
        count: 0,
        decade: false,
      },
      {
        year: 2002,
        count: 0,
        decade: false,
      },
      {
        year: 2003,
        count: 0,
        decade: false,
      },
      {
        year: 2004,
        count: 0,
        decade: false,
      },
      {
        year: 2005,
        count: 0,
        decade: false,
      },
      {
        year: 2006,
        count: 0,
        decade: false,
      },
      {
        year: 2007,
        count: 0,
        decade: false,
      },
      {
        year: 2008,
        count: 0,
        decade: false,
      },
      {
        year: 2009,
        count: 0,
        decade: false,
      },
      {
        year: 2010,
        count: 0,
        decade: true,
      },
      {
        year: 2011,
        count: 1,
        decade: false,
      },
      {
        year: 2012,
        count: 0,
        decade: false,
      },
      {
        year: 2013,
        count: 1,
        decade: false,
      },
      {
        year: 2014,
        count: 2,
        decade: false,
      },
      {
        year: 2015,
        count: 2,
        decade: false,
      },
      {
        year: 2016,
        count: 0,
        decade: false,
      },
      {
        year: 2017,
        count: 0,
        decade: false,
      },
      {
        year: 2018,
        count: 0,
        decade: true,
      },
    ],
    loading: false,
  },
  years: [
    {
      to: 2018,
      from: 2015,
      filter: '2015-01-01,2018-12-31',
    },
    {
      to: 2014,
      from: 2011,
      filter: '2011-01-01,2014-12-31',
    },
  ],
};

storiesOf('YearsStatsChart', module)
  .add('General', () => (
    <div style={{ width: 960 }}>
      <YearsStatsChart {...props} />
    </div>
  ))
  .add('Article', () => (
    <div style={{ width: 518 }}>
      <YearsStatsChart {...props} />
    </div>
  ));
