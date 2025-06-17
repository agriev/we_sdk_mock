import React from 'react';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import CloseButton from './close-button';

storiesOf('CloseButton', module).add('Medium', () => <CloseButton size="medium" onClick={action('onClick')} />);
