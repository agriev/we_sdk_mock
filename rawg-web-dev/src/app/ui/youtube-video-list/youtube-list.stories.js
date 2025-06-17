import React from 'react';

import { storiesOf } from '@storybook/react';
// import { action } from '@storybook/addon-actions';

import YoutubeVideoList from './youtube-video-list';

const video1 = {
  id: 302,
  external_id: 'dVVZaZ8yO6o',
  channel_id: 'UCA1tk_Wa3Lm4hMZ4ssPEuLw',
  channel_title: 'TheMediaCows',
  name: 'Far Cry 3 Gameplay Walkthrough – Make A Break',
  description:
    "This is the song 'Want You Gone' that play during the Portal 2 credits at the end of the game.. Lyrics: Well here we are again It's always such a pleasure Remember when you tried to...",
  created: '2011-04-19T10:49:32Z',
  view_count: 12242399,
  comments_count: 54932,
  like_count: 169777,
  dislike_count: 1800,
  favorite_count: 0,
  thumbnails: {
    default: {
      width: 120,
      url: 'https://i.ytimg.com/vi/dVVZaZ8yO6o/default.jpg',
      height: 90,
    },
    medium: {
      width: 320,
      url: 'https://i.ytimg.com/vi/dVVZaZ8yO6o/mqdefault.jpg',
      height: 180,
    },
    high: {
      width: 480,
      url: 'https://i.ytimg.com/vi/dVVZaZ8yO6o/hqdefault.jpg',
      height: 360,
    },
    sddefault: {
      width: 640,
      url: 'https://i.ytimg.com/vi/Q_XM1X-DjnI/sddefault.jpg',
      height: 480,
    },
    maxresdefault: {
      url: 'https://i.ytimg.com/vi/Q_XM1X-DjnI/maxresdefault.jpg',
    },
  },
};

storiesOf('YoutubeVideoList', module)
  .add('Desktop', () => (
    <div
      style={{
        width: 960,
        height: 500,
        backgroundColor: '#151515',
      }}
    >
      <YoutubeVideoList
        videos={[
          video1,
          Object.assign([], video1, { id: 1 }),
          Object.assign([], video1, { id: 2 }),
          Object.assign([], video1, { id: 3 }),
          Object.assign([], video1, { id: 4 }),
          Object.assign([], video1, { id: 5 }),
          Object.assign([], video1, { id: 6 }),
          Object.assign([], video1, { id: 7 }),
        ]}
        count={125}
      />
    </div>
  ))
  .add('Mobile', () => (
    <div
      style={{
        width: 320,
        height: 500,
        backgroundColor: '#151515',
      }}
    >
      <YoutubeVideoList
        videos={[
          video1,
          Object.assign([], video1, { id: 1 }),
          Object.assign([], video1, { id: 2 }),
          Object.assign([], video1, { id: 3 }),
          Object.assign([], video1, { id: 4 }),
          Object.assign([], video1, { id: 5 }),
          Object.assign([], video1, { id: 6 }),
          Object.assign([], video1, { id: 7 }),
        ]}
        count={125}
      />
    </div>
  ));
