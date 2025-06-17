import React from 'react';

import { storiesOf } from '@storybook/react';
// import { action } from '@storybook/addon-actions';

import GamePersons from './game-persons';

storiesOf('GamePersons', module).add('General', () => (
  <div>
    <GamePersons />
  </div>
));
