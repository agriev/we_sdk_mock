import React from 'react';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import AddGameCard from './add-game-card';

storiesOf('AddGameCard', module).add('Wide', () => (
  <AddGameCard title="Game Card Title" onClick={action('onClick')} wide />
));

storiesOf('AddGameCard', module).add('Not Wide', () => (
  <AddGameCard title="Game Card Title" onClick={action('onClick')} wide={false} />
));
