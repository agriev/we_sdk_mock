const getFormattedNumber = (number) => number.toLocaleString('en-GB');

export default function formatNumber(value) {
  if (typeof value === 'number') {
    return getFormattedNumber(value);
  }
  if (typeof value === 'string') {
    return getFormattedNumber(parseInt(value, 10));
  }

  throw new Error(`value have to be a number: ${value}`);
}
