// source: https://raw.githubusercontent.com/SamVerschueren/decode-uri-component/master/index.js

import has from 'lodash/has';

const token = '%[a-f0-9]{2}';
const singleMatcher = new RegExp(token, 'gi');
const multiMatcher = new RegExp(`(${token})+`, 'gi');

function decodeComponents(components, splitArgument) {
  try {
    // Try to decode the entire string first
    return decodeURIComponent(components.join(''));
  } catch (error) {
    // Do nothing
  }

  if (components.length === 1) {
    return components;
  }

  const split = splitArgument || 1;

  // Split the array in 2 parts
  const left = components.slice(0, split);
  const right = components.slice(split);

  return Array.prototype.concat.call([], decodeComponents(left), decodeComponents(right));
}

function decode(inputArgument) {
  let input = inputArgument;

  try {
    return decodeURIComponent(input);
  } catch (error) {
    let tokens = input.match(singleMatcher);

    for (let i = 1; i < tokens.length; i += 1) {
      input = decodeComponents(tokens, i).join('');

      tokens = input.match(singleMatcher);
    }

    return input;
  }
}

function customDecodeURIComponent(inputArgument) {
  let input = inputArgument;

  // Keep track of all the replacements and prefill the map with the `BOM`
  const replaceMap = {
    '%FE%FF': '\uFFFD\uFFFD',
    '%FF%FE': '\uFFFD\uFFFD',
  };

  let match = multiMatcher.exec(input);
  while (match) {
    try {
      // Decode as big chunks as possible
      replaceMap[match[0]] = decodeURIComponent(match[0]);
    } catch (error) {
      const result = decode(match[0]);

      if (result !== match[0]) {
        replaceMap[match[0]] = result;
      }
    }

    match = multiMatcher.exec(input);
  }

  // Add `%C2` at the end of the map to make sure it does
  // not replace the combinator before everything else
  replaceMap['%C2'] = '\uFFFD';

  const entries = Object.keys(replaceMap);

  for (const keyIdx in entries) {
    if (has(entries, keyIdx)) {
      const key = entries[keyIdx];
      // Replace all decoded components
      input = input.replace(new RegExp(key, 'g'), replaceMap[key]);
    }
  }

  return input;
}

export default function(encodedURI) {
  if (typeof encodedURI !== 'string') {
    throw new TypeError(`Expected \`encodedURI\` to be of type \`string\`, got \`${typeof encodedURI}\``);
  }

  try {
    // Try the built in decoder first
    return decodeURIComponent(encodedURI.replace(/\+/g, ' '));
  } catch (error) {
    // Fallback to a more advanced decoder
    return customDecodeURIComponent(encodedURI);
  }
}
