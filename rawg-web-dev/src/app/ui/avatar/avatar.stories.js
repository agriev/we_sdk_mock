import React from 'react';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import Avatar from './avatar';

const profile = {
  id: 3092,
  username: 'arikuza',
  full_name: '',
  avatar: null,
  is_active: false,
  connections: [],
  games_count: 176,
  collections_count: 3,
  bio: '&lt;h1&gt;Test&lt;/h1&gt;',
  email: 'schadnev@gmail.com',
  slug: 'arikuza',
  reviews_count: 5,
  comments_count: 0,
  last_login: '2018-02-02T11:25:40Z',
  date_joined: '2017-12-25T08:38:54Z',
  steam_id: 'http://steamcommunity.com/profiles/76561198013865456/',
  steam_id_status: 'ready',
  steam_id_date: '2018-02-28T08:12:35.001355Z',
  gamer_tag: '',
  gamer_tag_status: '',
  gamer_tag_date: null,
  psn_online_id: '',
  psn_online_id_status: '',
  psn_online_id_date: null,
  game_background: null,
  followers_count: 0,
  following_count: 1,
  share_image: 'https://devapi.rawg.io/api/images/users/527/527bff0841cd25afa8ed9e9fa5f86b63_3092.jpg',
  subscribe_mail_synchronization: false,
  select_platform: true,
  following: false,
  bio_raw: '<h1>Test</h1>',
  steam_id_locked: false,
  gamer_tag_locked: false,
  psn_online_id_locked: false,
  email_confirmed: true,
  set_password: true,
};

storiesOf('Avatar', module).add('Medium', () => <Avatar sz="10" onClick={action('onClick')} profile={profile} />);
storiesOf('Avatar', module).add('Large', () => <Avatar sz="100" onClick={action('onClick')} profile={profile} />);
