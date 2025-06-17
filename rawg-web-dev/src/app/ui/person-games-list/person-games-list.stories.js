import React from 'react';

import { storiesOf } from '@storybook/react';
// import { action } from '@storybook/addon-actions';

import PersonGamesList from './person-games-list';

storiesOf('PersonGamesList', module).add('General', () => (
  <div>
    <PersonGamesList />
  </div>
));
