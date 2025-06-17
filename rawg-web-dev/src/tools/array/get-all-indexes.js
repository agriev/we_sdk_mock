function getAllIndexes(array, value) {
  const indexes = [];
  let i;
  for (i = 0; i < array.length; i += 1) {
    if (array[i] === value) indexes.push(i);
  }

  return indexes;
}

export default getAllIndexes;
