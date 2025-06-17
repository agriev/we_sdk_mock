import React from 'react';

import { storiesOf } from '@storybook/react';

import RatingChart from './rating-chart';

const props1 = {
  ratingTop: 5,
  reviewsCount: 27,
  ratings: [
    {
      id: 5,
      title: 'exceptional',
      positive: true,
    },
    {
      id: 4,
      title: 'recommended',
      positive: true,
    },
    {
      id: 3,
      title: 'meh',
      positive: false,
    },
    {
      id: 1,
      title: 'skip',
      positive: false,
    },
  ],
  charts: {
    genre: {
      position: 4,
      change: 'equal',
      name: 'Strategy',
    },
    year: {
      position: 3,
      change: 'equal',
      year: 2011,
    },
  },
};

const props2 = {
  ratingTop: 4,
  gamesCount: 5,
  reviewsCount: 186,
  ratings: [
    {
      id: 5,
      title: 'exceptional',
      positive: true,
    },
    {
      id: 4,
      title: 'recommended',
      positive: true,
    },
    {
      id: 3,
      title: 'meh',
      positive: false,
    },
    {
      id: 1,
      title: 'skip',
      positive: false,
    },
  ],
};

storiesOf('RatingChart', module)
  .add('In game', () => (
    <div style={{ width: 504 }}>
      <RatingChart {...props1} />
    </div>
  ))
  .add('For person', () => (
    <div style={{ width: 504 }}>
      <RatingChart {...props2} />
    </div>
  ));
