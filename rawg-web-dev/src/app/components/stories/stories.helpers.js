import { always, ifElse, lte, unapply, nth, defaultTo } from 'ramda';

import { get } from 'lodash';

import appHelper from 'app/pages/app/app.helper';

// import VideoJSPlayer from './components/player-videojs';
import VideoReactPlayer from './components/player-video-react';

const zero = always(0);
const oneHundred = always(100);
const secondArgument = unapply(nth(1));

const players = {
  // 'video.js': VideoJSPlayer,
  'video-react': VideoReactPlayer,
};

export const determineImplementation = ({ query }) => {
  const defaultPlayer = 'video-react';

  return {
    Player: query.player ? players[query.player] : players[defaultPlayer],
    playerImpl: query.player || defaultPlayer,
  };
};

export const getVideos = ({ size, playingGroup, groups }) => {
  const group = get(groups, `[${playingGroup}]`, {});

  const videosPropertyName =
    appHelper.isPhoneSize({ size }) && group.videos_mobile && group.videos_mobile.length > 0
      ? 'videos_mobile'
      : 'videos';

  return get(group, videosPropertyName, []);
};

export const getPlayingState = ({ size, playingGroup, groups, playingVideo: playingVideoArgument, setBars }) => {
  const groupVids = getVideos({ size, groups, playingGroup });
  const playingVideo = defaultTo(Math.max(0, groupVids.findIndex((vid) => vid.new === true)), playingVideoArgument);
  const belowIdx = lte(playingVideo);

  setBars(groupVids.map(secondArgument).map(ifElse(belowIdx, zero, oneHundred)));

  return {
    playingGroup,
    playingVideo,
  };
};
