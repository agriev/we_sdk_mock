import React from 'react';

import { storiesOf } from '@storybook/react';

import MyLibraryMenu from './my-library-menu';

storiesOf('MyLibraryMenu', module).add('General', () => (
  <div>
    <MyLibraryMenu />
  </div>
));
