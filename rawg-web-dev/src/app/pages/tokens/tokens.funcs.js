/* eslint-disable import/prefer-default-export, no-mixed-operators */

export const calcTimeLeft = (startString) => {
  const start = new Date(startString).getTime();
  const now = new Date().getTime();
  const timeDiff = Math.abs(start - now) / 1000;
  const days = Math.floor(timeDiff / (3600 * 24));
  const hours = Math.floor((timeDiff - days * 3600 * 24) / 3600);
  const mins = Math.floor((timeDiff - days * 3600 * 24 - hours * 3600) / 60);

  return [days, hours, mins];
};
