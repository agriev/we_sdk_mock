/* eslint-disable no-console */

import config from 'config/config';

const start = (title) => {
  if (config.loggerGroups.ssrPerfomance) {
    console.time(title);
  }
};

const end = (title) => {
  if (config.loggerGroups.ssrPerfomance) {
    console.timeEnd(title);
  }
};

const logPerfomance = {
  start,
  end,
};

export default logPerfomance;
