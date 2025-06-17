import getAllIndexes from 'tools/array/get-all-indexes';

const findNearestIndex = (array, item, idx) => {
  const allOccures = getAllIndexes(array, item);

  return allOccures.reduce((nearest, occur) => {
    const distance = Math.abs(occur - idx);
    if (distance < nearest) {
      return occur;
    }

    return nearest;
  }, Infinity);
};

export default findNearestIndex;
