/* eslint-disable no-self-compare, no-console */

import has from 'lodash/has';
import isObject from 'lodash/isObject';

function is(x, y) {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  }
  return x !== x && y !== y;
}

export default function shallowEqual(objectA, objectB, { debug = false, depth = 1 } = {}) {
  if (is(objectA, objectB)) return true;

  if (typeof objectA !== 'object' || objectA === null || typeof objectB !== 'object' || objectB === null) {
    if (debug) {
      console.log('shallowEqual: some of two values is null or not objects', {
        objectA,
        objectB,
      });
    }
    return false;
  }

  const keysA = Object.keys(objectA);
  const keysB = Object.keys(objectB);

  if (keysA.length !== keysB.length) {
    if (debug) {
      console.log('shallowEqual: length of objects keys is different', {
        objectA,
        objectB,
      });
    }
    return false;
  }

  for (const elementIdx in keysA) {
    if (has(keysA, elementIdx)) {
      const element = keysA[elementIdx];

      if (isObject(objectA[element]) && depth > 1) {
        if (!shallowEqual(objectA[element], objectB[element], { depth: depth - 1, debug })) {
          return false;
        }

        // eslint-disable-next-line no-continue
        continue;
      }

      if (!has(objectB, element) || !is(objectA[element], objectB[element])) {
        if (debug) {
          console.log(
            `shallowEqual: key ${element}, depth ${depth} - is different`,
            objectA[element],
            objectB[element],
          );
        }
        return false;
      }
    }
  }

  return true;
}
