import get from 'lodash/get';

const getYoutubeVideoCode = (url) => {
  const youtubeRegex = /youtu(?:be\.com\/(?:watch\?v=|v\/)|\.be\/)([^&]+).*$/i;

  return get(youtubeRegex.exec(url), '[1]');
};

export default getYoutubeVideoCode;
