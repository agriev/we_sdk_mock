import React from 'react';

import { storiesOf } from '@storybook/react';
// import { action } from '@storybook/addon-actions';

import SimpleButton from './simple-button';

storiesOf('SimpleButton', module).add('General', () => (
  <div>
    <SimpleButton />
  </div>
));
