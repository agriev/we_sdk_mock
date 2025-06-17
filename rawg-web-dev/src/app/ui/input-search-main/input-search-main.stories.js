import React from 'react';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import InputSearchMain from './input-search-main';

storiesOf('InputSearchMain', module)
  .add('Desktop', () => (
    <div
      style={{
        width: 960,
        padding: 70,
        height: 500,
        backgroundImage: 'linear-gradient(to bottom, #053f6a, #151515)',
      }}
    >
      <InputSearchMain placeholder="Find games" onChange={action('onChange')} />
    </div>
  ))
  .add('Mobile', () => (
    <div
      style={{
        width: 300,
        padding: 70,
        height: 500,
        backgroundImage: 'linear-gradient(to bottom, #053f6a, #151515)',
      }}
    >
      <InputSearchMain placeholder="Find games" onChange={action('onChange')} />
    </div>
  ));
