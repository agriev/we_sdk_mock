import React from 'react';

import { storiesOf } from '@storybook/react';
// import { action } from '@storybook/addon-actions';

import ReviewCard from './review-card';

const props = {
  review: {
    id: 2227,
    user: {
      id: 2623,
      username: 'M0ck1ngb1rd',
      slug: 'm0ck1ngb1rd',
      full_name: '',
      avatar: null,
      games_count: 137,
      collections_count: 1,
    },
    text:
      'Сколько раз ее не начинал, до конца так и не добрался.<br/>Игра настолько огромная, что в какой то степени это становится нелепо и начинает тошнить.<br/>Хотя нельзя не признавать ее влияния на индустрию в целом.<br/>Это такой ПУБГ от мира сингловых игр.<p>Сколько раз ее не начинал, до конца так и не добрался.<br/>Игра настолько огромная, что в какой то степени это становится нелепо и начинает тошнить.<br/>Хотя нельзя не признавать ее влияния на индустрию в целом.<br/>Это такой ПУБГ от мира сингловых игр.</p>',
    text_preview: '',
    text_previews: null,
    text_attachments: 0,
    rating: 3,
    reactions: [],
    created: '2017-10-20T14:46:43.363235Z',
    edited: '2017-10-31T12:48:44.417338Z',
    likes_count: 8,
    likes_positive: 6,
    likes_rating: 4,
    comments_count: 0,
    posts_count: 0,
    language: 'rus',
    user_like: false,
    user_post: false,
    can_delete: false,
  },
  kind: 'slider',
};

storiesOf('ReviewCard', module)
  .add('Desktop', () => (
    <div
      style={{
        width: 479,
        minHeight: 298,
        backgroundColor: '#14171a',
      }}
    >
      <ReviewCard {...props} />
    </div>
  ))
  .add('Mobile', () => (
    <div
      style={{
        width: 239,
        minHeight: 298,
        backgroundColor: '#14171a',
      }}
    >
      <ReviewCard {...props} />
    </div>
  ));
