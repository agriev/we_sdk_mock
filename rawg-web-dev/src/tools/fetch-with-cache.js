import fetch from 'tools/fetch';
import config from 'config/config';

export default function fetchWithCache(cacheMins = Infinity) {
  const cachedResults = {};
  const cachedTimes = {};

  return async function dataFetcher(url, options) {
    const { locale } = options.state.app;
    const cachedTime = cachedTimes[locale];
    const cachedResult = cachedResults[locale];

    const currentTime = new Date();
    const cachedTimeMs = cachedTime && cachedTime.getTime();
    const cacheValid = cachedTimeMs && cachedTimeMs + cacheMins * 60 * 1000 > currentTime.getTime();

    if (cachedResult && cacheValid) {
      if (config.loggerGroups.cachedFetchs) {
        // eslint-disable-next-line no-console
        console.log(`- Using cached result for ${url}`);
      }

      return cachedResult;
    }

    const result = await fetch(url, options);

    cachedResults[locale] = result;
    cachedTimes[locale] = new Date();

    return result;
  };
}
