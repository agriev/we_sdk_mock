const humanTimeDiff = (startTime, endTime) => {
  const start = startTime.getTime();
  const end = (endTime || new Date()).getTime();

  const timeDiff = Math.abs(end - start) / 1000;
  const days = Math.floor(timeDiff / (3600 * 24));
  const hours = Math.floor((timeDiff - days * 3600 * 24) / 3600);
  const mins = Math.floor((timeDiff - days * 3600 * 24 - hours * 3600) / 60);
  const secs = Math.floor(timeDiff - days * 3600 * 24 - hours * 3600 - mins * 60);

  if (hours) {
    return `${hours} hours, ${mins} minutes, ${secs} seconds`;
  }

  if (mins) {
    return `${mins} minutes, ${secs} seconds`;
  }

  return `${secs} seconds`;
};

export default humanTimeDiff;
