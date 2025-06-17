import React from 'react';

import { storiesOf } from '@storybook/react';
// import { action } from '@storybook/addon-actions';

import PlatformsStats from './platforms-stats';

const props = {
  size: 'desktop',
  platforms: {
    results: [
      {
        percent: 40,
        count: 2,
        platform: {
          id: 3,
          name: 'PC',
          slug: 'pc',
        },
      },
      {
        percent: 21,
        count: 2,
        platform: {
          id: 2,
          name: 'Play Station',
          slug: 'playstation',
        },
      },
      {
        percent: 20,
        count: 1,
        platform: {
          id: 5,
          name: 'Mac',
          slug: 'mac',
        },
      },
      {
        percent: 20,
        count: 1,
        platform: {
          id: 6,
          name: 'iOs',
          slug: 'ios',
        },
      },
      {
        percent: 20,
        count: 1,
        platform: {
          id: 6,
          name: 'Linux',
          slug: 'linux',
        },
      },
      {
        percent: 17,
        count: 1,
        platform: {
          id: 6,
          name: 'Nintendo',
          slug: 'nintendo',
        },
      },
      {
        percent: 15,
        count: 1,
        platform: {
          id: 6,
          name: 'XBox',
          slug: 'xbox',
        },
      },
    ],
    count: 3,
    total: 3,
  },
};

storiesOf('PlatformsStats', module)
  .add('Big', () => (
    <div style={{ width: 960 }}>
      <PlatformsStats {...props} />
    </div>
  ))
  .add('Small', () => (
    <div style={{ width: 528 }}>
      <PlatformsStats {...props} type="small" />
    </div>
  ))
  .add('Rows', () => (
    <div style={{ width: 300 }}>
      <PlatformsStats {...props} type="rows" />
    </div>
  ));
