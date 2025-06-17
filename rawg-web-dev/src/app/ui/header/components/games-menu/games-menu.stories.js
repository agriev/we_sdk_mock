import React from 'react';

import { storiesOf } from '@storybook/react';

import GamesMenu from './games-menu';

storiesOf('GamesMenu', module).add('General', () => (
  <div>
    <GamesMenu />
  </div>
));
