import compact from 'lodash/compact';

const sectionsIntlId = {
  home: 'shared.home_page_name',
  games: 'games.title',
  browse: 'catalog.browse_title',
  suggested: 'catalog.suggested_title',
  'release-dates': 'games.tab_calendar',
  screenshots: 'game.screenshots',
  suggestions: 'game.suggestions',
  collections: 'shared.header_collections',
  achievements: 'game.achievements',
  imgur: 'game.imgur',
  reddit: 'game.reddit',
  twitch: 'game.twitch',
  youtube: 'game.youtube',
  team: 'game.team',
  reviews: 'game.reviews',
  posts: 'game.posts',
  popular: 'collections.popular',
  charts: 'games.charts_title',
  updates: 'game.events',
  patches: 'game.patches',
  cheats: 'game.cheats',
  review: 'game.review',
};

const getBreadcrumbsItem = (path, name) => ({ path, name });

export default function getBreadcrumbs(path, customNames, intl) {
  const sections = path.split('/');

  const breadcrumbs = sections.map((section, index) => {
    if (section === '') {
      return index === 0 ? getBreadcrumbsItem('/', intl.formatMessage({ id: sectionsIntlId.home })) : null;
    }

    const sectionPath = sections.slice(0, index + 1).join('/');

    if (customNames && customNames[section]) {
      return getBreadcrumbsItem(sectionPath, customNames[section]);
    }

    if (sectionsIntlId[section]) {
      return getBreadcrumbsItem(sectionPath, intl.formatMessage({ id: sectionsIntlId[section] }));
    }

    return null;
  });

  return compact(breadcrumbs);
}
