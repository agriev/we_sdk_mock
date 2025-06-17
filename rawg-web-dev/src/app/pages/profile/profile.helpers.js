/* eslint-disable import/prefer-default-export */

import colorHandler from 'tools/color-handler';
import memoize from 'memoize-one';

export const getBackgroundArt = () =>
  memoize((gameBackground) => ({
    height: '450px',
    image: {
      path: gameBackground ? gameBackground.url : undefined,
      color: gameBackground ? `rgba(${colorHandler.hexToRgb(gameBackground.dominant_color).join(',')},0.8)` : '',
    },
  }));
