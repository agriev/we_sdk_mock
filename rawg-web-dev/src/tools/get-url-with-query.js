import qs from 'qs';

const getUrlWidthQuery = (location, appendQuery) => {
  const query = qs.stringify({ ...location.query, ...appendQuery }, { addQueryPrefix: true });
  return `${location.pathname}${query}`;
};

export default getUrlWidthQuery;
