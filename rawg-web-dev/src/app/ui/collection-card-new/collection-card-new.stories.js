import React from 'react';

import { storiesOf } from '@storybook/react';
// import { action } from '@storybook/addon-actions';

import CollectionCard from './collection-card-new';

const props = {
  collection: {
    id: 675,
    slug: '30-most-anticipated-games-of-2018',
    name: 'Most Anticipated Games of 2018',
    description:
      'The new year has started already and we have a heap of (hopefully) great games ahead. I did some research andcompiled over 30 games that will hit the market during 2018. Here&#39;s every game worth looking forward to. <br /><br />If I missed something, just suggest a game below and I&#39;ll add it to the list! Since it is just the beginning of the year, it&#39;s clear I didn&#39;t include some games that are yet to be revealed and some games may be delayed, but at least this is a good start.',
    creator: {
      id: 54,
      username: 'elCT',
      slug: 'elct',
      full_name: 'Sergey Ulankin',
      avatar: 'https://devapi.rawg.io/media/avatars/aa7/aa7bea518276b7aba1c6be044bfe4016.jpg',
      games_count: 30,
      collections_count: 3,
    },
    created: '2018-01-03T17:45:04.349278Z',
    game_background: {
      dominant_color: '1b1208',
      url:
        'https://resize.rawg.io/media/https://api.rawg.io/media/screenshots/c32/c32eca1d141905a91c8150de5dda38e3.jpg',
      saturated_color: '1c1107',
    },
    backgrounds: [
      {
        dominant_color: '1b1208',
        url:
          'https://resize.rawg.io/media/https://api.rawg.io/media/screenshots/c32/c32eca1d141905a91c8150de5dda38e3.jpg',
        saturated_color: '1c1107',
      },
      {
        dominant_color: '8f8771',
        url:
          'https://resize.rawg.io/media/https://api.rawg.io/media/screenshots/9e4/9e42645c22577fe3918ff6438db47fdf.jpg',
        saturated_color: '447cac',
      },
      {
        dominant_color: '48444b',
        url: 'https://devapi.rawg.io/media/games/cda/cdad08771bdcf3a3a154fe90075b4d31.jpeg',
        saturated_color: 'be523d',
      },
      {
        dominant_color: '091217',
        url: 'https://devapi.rawg.io/media/games/9d6/9d6de0f90033513f9bdfe7749500044a.jpg',
        saturated_color: '051413',
      },
    ],
    games_count: 34,
    followers_count: 1,
    posts_count: 0,
    comments_count: 0,
    likes_count: 2,
    likes_positive: 2,
    likes_rating: 2,
    share_image: 'https://devapi.rawg.io/api/images/collections/ff0/ff014d1603d90b6e8ea9549eb4599712_675.jpg',
    language: 'eng',
    description_raw:
      "The new year has started already and we have a heap of (hopefully) great games ahead. I did some research andcompiled over 30 games that will hit the market during 2018. Here's every game worth looking forward to. \n\nIf I missed something, just suggest a game below and I'll add it to the list! Since it is just the beginning of the year, it's clear I didn't include some games that are yet to be revealed and some games may be delayed, but at least this is a good start.",
    game_covers: [
      {
        dominant_color: '8f8771',
        url:
          'https://resize.rawg.io/media/https://api.rawg.io/media/screenshots/9e4/9e42645c22577fe3918ff6438db47fdf.jpg',
        saturated_color: '447cac',
      },
      {
        dominant_color: '48444b',
        url: 'https://devapi.rawg.io/media/games/cda/cdad08771bdcf3a3a154fe90075b4d31.jpeg',
        saturated_color: 'be523d',
      },
      {
        dominant_color: '091217',
        url: 'https://devapi.rawg.io/media/games/9d6/9d6de0f90033513f9bdfe7749500044a.jpg',
        saturated_color: '051413',
      },
    ],
    following: false,
    user_like: false,
  },
};

const props2 = { collection: { ...props.collection, game_background: {} } };

storiesOf('CollectionCard', module)
  .add('General', () => <CollectionCard {...props} />)
  .add('No background', () => <CollectionCard {...props2} />);
