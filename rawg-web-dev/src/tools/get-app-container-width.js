import env from 'config/env';

const getAppContainerWidth = () => {
  if (env.isClient()) {
    return document.documentElement.clientWidth;
  }

  return 1024;
};

export default getAppContainerWidth;
