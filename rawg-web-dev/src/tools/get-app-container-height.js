import env from 'config/env';

const getAppContainerHeight = () => {
  if (env.isClient()) {
    return document.documentElement.clientHeight;
  }

  return 1024;
};

export default getAppContainerHeight;
