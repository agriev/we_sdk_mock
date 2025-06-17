import React from 'react';

import { storiesOf } from '@storybook/react';
// import { action } from '@storybook/addon-actions';

import UserListLine from './user-list-line';

const users = {
  results: [
    {
      id: 123,
      username: 'Sawyer',
      slug: 'sawyer',
      full_name: '',
      games_count: 53,
      avatar: 'https://devapi.rawg.io/media/avatars/607/607d4ae3bc604cbc615ba5601b489bab.jpg',
      collections_count: 0,
    },
    {
      id: 2009,
      username: 'menanggung',
      slug: 'menanggung',
      full_name: '',
      avatar: 'https://devapi.rawg.io/media/avatars/a3a/a3a8922aa51307b9e6e2d85b43e40495.png',
      games_count: 6,
      collections_count: 1,
    },
    {
      id: 93,
      username: 'yaroslav59',
      slug: 'yaroslav59',
      full_name: 'Yaroslav Sokolovsky',
      avatar: null,
      games_count: 335,
      collections_count: 0,
    },
    {
      id: 1485,
      username: 'alex78',
      slug: 'alex78',
      full_name: 'Alex Shvets',
      avatar: 'https://devapi.rawg.io/media/avatars/aa7/aa7bea518276b7aba1c6be044bfe4016.jpg',
      games_count: 24,
      collections_count: 0,
    },
    {
      id: 1252,
      username: 'wooddy',
      slug: 'wooddy',
      full_name: 'Alexey Verteletskiy',
      avatar: null,
      games_count: 118,
      collections_count: 0,
    },
  ],
  count: 54,
  status: 'playing',
};

storiesOf('UserListLine', module).add('General', () => (
  <div>
    <UserListLine users={users} />
  </div>
));
