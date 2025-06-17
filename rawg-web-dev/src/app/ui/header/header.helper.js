import compact from 'lodash/compact';

import paths from 'config/paths';

const gameSpecificPages = [paths.releaseDates, paths.gamesCharts, paths.gamesBrowse, paths.gamesSuggestions];

const isAllGamesActive = (pathname) =>
  pathname.startsWith(paths.games) &&
  !gameSpecificPages.includes(pathname) &&
  !pathname.includes(paths.gamesSuggestions);

const getSubHeaderItems = ({ pathname, needsSuggestions }) =>
  compact([
    needsSuggestions && {
      path: paths.gamesSuggestions,
      labelId: 'games.tab_suggestions',
      active: pathname.includes(paths.gamesSuggestions),
    },
    {
      path: paths.games,
      labelId: 'games.tab_games',
      active: isAllGamesActive(pathname),
    },
    {
      path: paths.gamesBrowse,
      labelId: 'games.tab_browse',
      active: pathname.includes(paths.gamesBrowse),
    },
    {
      path: paths.releaseDates,
      labelId: 'games.tab_calendar',
      active: pathname.includes(paths.releaseDates),
    },
    {
      path: paths.gamesCharts,
      labelId: 'games.tab_charts',
      active: pathname.includes(paths.gamesCharts),
    },
    {
      path: paths.collectionsPopular,
      labelId: 'shared.header_collections',
      active: pathname.includes(paths.collections) && !pathname.includes(paths.games),
    },
  ]);

export default {
  getSubHeaderItems,
};
