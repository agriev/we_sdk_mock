import { configure, addDecorator } from '@storybook/react';
import centered from '@storybook/addon-centered';
import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { IntlProvider } from 'react-intl';
import store from '../src/shared/app/store';
import generateMessages from './generateMessages';

function Provider({ story }) {
  return (
    <ReduxProvider
      store={store(
        {},
        {
          app: {
            size: 'desktop',
            ratings: [
              {
                id: 5,
                title: 'exceptional',
                positive: true,
              },
              {
                id: 4,
                title: 'recommended',
                positive: true,
              },
              {
                id: 3,
                title: 'meh',
                positive: false,
              },
              {
                id: 1,
                title: 'skip',
                positive: false,
              },
            ],
            reactions: [
              {
                id: 1,
                title: 'Blew my mind',
                positive: true,
              },
              {
                id: 2,
                title: 'Just one more turn',
                positive: true,
              },
              {
                id: 3,
                title: 'Can’t stop playing',
                positive: true,
              },
              {
                id: 4,
                title: 'Time-tested',
                positive: true,
              },
              {
                id: 5,
                title: 'Liked before it became a hit',
                positive: true,
              },
              {
                id: 6,
                title: 'Constantly dying and enjoy it',
                positive: true,
              },
              {
                id: 7,
                title: 'Sit Back and Relax',
                positive: true,
              },
              {
                id: 8,
                title: 'Better With Friends',
                positive: true,
              },
              {
                id: 9,
                title: 'Underrated',
                positive: true,
              },
              {
                id: 10,
                title: 'That Ending!',
                positive: true,
              },
              {
                id: 11,
                title: 'Beaten more than once',
                positive: true,
              },
              {
                id: 12,
                title: 'OST on repeat',
                positive: true,
              },
              {
                id: 13,
                title: 'Buggy as hell',
                positive: false,
              },
              {
                id: 14,
                title: 'Disappointment of the year',
                positive: false,
              },
              {
                id: 15,
                title: 'Waste of time',
                positive: false,
              },
              {
                id: 16,
                title: 'Boooring',
                positive: false,
              },
              {
                id: 17,
                title: 'Ugly as my life',
                positive: false,
              },
              {
                id: 18,
                title: 'I could make it better',
                positive: false,
              },
              {
                id: 19,
                title: 'Oh God i managed it',
                positive: false,
              },
              {
                id: 20,
                title: 'Game over at last!',
                positive: false,
              },
              {
                id: 21,
                title: 'Reviewers bribed',
                positive: false,
              },
            ],
          },
        },
      )}
    >
      {story}
    </ReduxProvider>
  );
}

addDecorator(story => <Provider story={story()} />);
addDecorator(story => <div style={{ padding: 150 }}>{story()}</div>);

// automatically import all files ending in *.stories.js
const req = require.context('../src/shared', true, /\.stories\.js$/);
function loadStories() {
  addDecorator(story => (
    <IntlProvider locale={'en'} key={'en'} messages={generateMessages()['en']}>
      {story()}
    </IntlProvider>
  ));
  req.keys().forEach(filename => req(filename));
}

configure(loadStories, module);
