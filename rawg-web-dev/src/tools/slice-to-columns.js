export default function sliceToColumns(array) {
  const resultObject = { firstColumn: [], secondColumn: [] };

  array.map((element, index) => {
    if (index % 2 === 0) {
      resultObject.firstColumn.push(element);
    } else {
      resultObject.secondColumn.push(element);
    }

    return undefined;
  });

  return resultObject;
}
