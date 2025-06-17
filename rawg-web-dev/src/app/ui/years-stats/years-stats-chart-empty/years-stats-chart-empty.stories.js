import React from 'react';

import { storiesOf } from '@storybook/react';

import YearsStatsChartEmpty from './years-stats-chart-empty';

storiesOf('YearsStatsChartEmpty', module).add('General', () => (
  <div>
    <YearsStatsChartEmpty />
  </div>
));
