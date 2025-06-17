import objectToUrl from 'tools/string/object-to-url';

export default {
  seoPaths: '/index',

  welcome: '/welcome',
  dev: '/dev',
  newMain: '/new-main',
  index: '/',
  showcase: '/showcase',
  tldr: '/tldr',
  tldrStory: (slug) => `/?tldr=${slug}`,

  login: '/login',
  register: '/signup',
  confirmEmail(token) {
    return token ? `/confirm_email/${token}` : '/confirm_email';
  },
  gameAccounts: '/import',
  accountsImport(account) {
    return `/import/${account}`;
  },
  gameAccountsVerification: '/import/verification',
  rateUserGames: '/rate',
  rateTopGames: '/rate/thebest',
  passwordRecovery: '/password_recovery',
  passwordReset(uid, token) {
    return uid ? `/password_reset/${uid}/${token}` : '/password_reset';
  },
  feedback: '/feedback',

  settings: '/settings',
  settingsInfo: '/settings/info',
  settingsGameAccounts: '/settings/gaming-profiles',
  settingsGameAccountsVerification: '/settings/import-verification',
  settingsSocialAccounts: '/settings/social-profiles',
  settingsPassword: '/settings/password',
  settingsEmail: '/settings/email',
  settingsNotifications: '/settings/notifications',
  settingsAdvanced: '/settings/advanced',
  settingsExport: '/settings/export',
  deleteProfile: '/delete-profile',
  downloadUserData: '/download-user-data',

  tokensDashboard: '/tokens',
  tokensExchange: '/tokens/exchange',
  tokensOffer(id) {
    return `/tokens/${id}`;
  },

  games: '/games',
  gamesRoutes: '/games/*',
  releaseDates: '/video-game-releases',
  releaseDatesMonth: (year, month) => `/video-game-releases/${year}-${month}`,
  releaseDatesOld1: '/release-dates',
  releaseDatesOld2: '/games/release-dates',
  gamesCharts: '/games/charts',
  gamesBrowse: '/games/browse',
  gamesSuggestions: '/games/suggestions',
  gamesSuggestionsEntity: (id) => `/games/suggestions/${id}`,
  game(slug, { toReviews } = {}) {
    if (toReviews) {
      return `/games/${slug}#reviews`;
    }

    return `/games/${slug}`;
  },
  // ampGame(id) {
  //   return `/amp/games/${id}`;
  // },
  ampGame(id) {
    return `/amp/games/${id}`;
  },
  gameReviews(id, { nested } = {}) {
    return nested ? 'reviews' : `/games/${id}/reviews`;
  },
  gamePosts(id, { nested } = {}) {
    return nested ? 'posts' : `/games/${id}/posts`;
  },
  gameScreenshots(id, { nested } = {}) {
    return nested ? 'screenshots' : `/games/${id}/screenshots`;
  },
  gameScreenshotsView(id, activeIndex) {
    return `/games/${id}/screenshots/${activeIndex}`;
  },
  gameSuggestions(id, { nested } = {}) {
    return nested ? 'suggestions' : `/games/${id}/suggestions`;
  },
  gameAchievements(id, { nested } = {}) {
    return nested ? 'achievements' : `/games/${id}/achievements`;
  },
  gameCollections(id, { nested } = {}) {
    return nested ? 'collections' : `/games/${id}/collections`;
  },
  gameImgur(id, { nested } = {}) {
    return nested ? 'imgur' : `/games/${id}/imgur`;
  },
  gameImgurView(id, activeIndex) {
    return `/games/${id}/imgur/${activeIndex}`;
  },
  gameReddit(id, { nested } = {}) {
    return nested ? 'reddit' : `/games/${id}/reddit`;
  },
  gameTwitch(id, { nested } = {}) {
    return nested ? 'twitch' : `/games/${id}/twitch`;
  },
  gameTwitchView(id, activeIndex) {
    return `/games/${id}/twitch/${activeIndex}`;
  },
  gameYoutube(id, { nested } = {}) {
    return nested ? 'youtube' : `/games/${id}/youtube`;
  },
  gameYoutubeView(id, activeIndex) {
    return `/games/${id}/youtube/${activeIndex}`;
  },
  gameTeam(id, { nested } = {}) {
    return nested ? 'team' : `/games/${id}/team`;
  },
  gamePatches(id, { nested } = {}) {
    return nested ? 'patches' : `/games/${id}/patches`;
  },
  gamePatch(gameSlug, patchId) {
    return `/games/${gameSlug}/patches/${patchId}`;
  },
  gameDemos(id, { nested } = {}) {
    return nested ? 'demos' : `/games/${id}/demos`;
  },
  gameDemo(gameSlug, demoId) {
    return `/games/${gameSlug}/demos/${demoId}`;
  },
  gameCheats(id, { nested } = {}) {
    return nested ? 'cheats' : `/games/${id}/cheats`;
  },
  gameCheat(gameSlug, cheatId) {
    return `/games/${gameSlug}/cheats/${cheatId}`;
  },
  gameReview(gameSlug) {
    return `/games/${gameSlug}/review`;
  },
  gameCreateBasic: '/games/create',
  gameCreateScreenshots: '/games/create/screenshots',
  gameEditBasic: (id) => `/games/${id}/edit`,
  gameEditScreenshots: (id) => `/games/${id}/edit/screenshots`,
  gameEditStores: (id) => `/games/${id}/edit/stores`,
  gameEditTags: (id) => `/games/${id}/edit/tags`,
  gameEditCreators: (id) => `/games/${id}/edit/creators`,
  gameEditLinkedGames: (id) => `/games/${id}/edit/linked-games`,

  developers: '/developers',
  developer: (slug) => `/developers/${slug}`,

  publishers: '/publishers',
  publisher: (slug) => `/publishers/${slug}`,

  tags: '/tags',
  tag: (slug) => `/tags/${slug}`,
  utag: (slug) => `/utags/${slug}`,

  categories: '/categories',
  category: (slug) => `/categories/${slug}`,

  platforms: '/platforms',
  platform: (slug) => `/games/${slug}`,

  stores: '/stores',
  store: (slug) => `/games/${slug}`,

  genres: '/genres',
  genre: (slug) => `/games/${slug}`,

  creators: '/creators',
  creator: (slug) => `/creators/${slug}`,

  profile(id) {
    return `/@${id}`;
  },
  profileGames(id, { nested } = {}) {
    return nested ? 'games' : `/@${id}/games`;
  },
  profileGamesStatus(id, status, { nested } = {}) {
    return nested ? status : `/@${id}/games/${status}`;
  },
  profileGamesPlaying(id, { nested } = {}) {
    return nested ? 'playing' : `/@${id}/games/playing`;
  },
  profileGamesBeaten(id, { nested } = {}) {
    return nested ? 'beaten' : `/@${id}/games/beaten`;
  },
  profileGamesToPlay(id, { nested } = {}) {
    return nested ? 'wishlist' : `/@${id}/wishlist`;
  },
  profileGamesYet(id, { nested } = {}) {
    return nested ? 'yet' : `/@${id}/games/yet`;
  },
  profileGamesOwned(id, { nested } = {}) {
    return nested ? 'owned' : `/@${id}/games/owned`;
  },
  profileGamesDropped(id, { nested } = {}) {
    return nested ? 'dropped' : `/@${id}/games/dropped`;
  },
  profileCollections(id, { nested } = {}) {
    return nested ? 'collections' : `/@${id}/collections`;
  },
  profileCollectionsTab(id, tab, { nested } = {}) {
    return nested ? tab : `/@${id}/collections/${tab}`;
  },
  profileCollectionsCreated(id, { nested } = {}) {
    return nested ? 'created' : `/@${id}/collections/created`;
  },
  profileCollectionsFollowing(id, { nested } = {}) {
    return nested ? 'following' : `/@${id}/collections/following`;
  },
  profileConnections(id, { nested } = {}) {
    return nested ? 'connections' : `/@${id}/connections`;
  },
  profileConnectionsTab(id, tab, { nested } = {}) {
    return nested ? tab : `/@${id}/connections/${tab}`;
  },
  profileConnectionsFollowing(id, { nested } = {}) {
    return nested ? 'following' : `/@${id}/connections/following`;
  },
  profileConnectionsFollowers(id, { nested } = {}) {
    return nested ? 'followers' : `/@${id}/connections/followers`;
  },
  profileReviews(id, { nested } = {}) {
    return nested ? 'reviews' : `/@${id}/reviews`;
  },
  profileDeveloper(id, { nested } = {}) {
    return nested ? 'developer' : `/@${id}/developer`;
  },
  profileApiKey(id, { nested } = {}) {
    return nested ? 'apikey' : `/@${id}/apikey`;
  },

  collectionsPopular: '/collections/popular',
  collections: '/collections',
  collectionCreate: '/collections/create',
  collection(slug) {
    return `/collections/${slug}`;
  },
  collectionEdit(id) {
    return `/collections/${id}/edit`;
  },
  collectionAddGames(id) {
    return `/collections/${id}/add`;
  },
  collectionSuggest(id) {
    return `/collections/${id}/suggest`;
  },
  collectionComments(id) {
    return `/collections/${id}#comments`;
  },
  collectionComment(collectionId, itemId, commentId, item, comment) {
    return `/collections/${collectionId}?item=${item}&comment=${comment}#${commentId}`;
  },
  collectionFeedItemText(collectionId, itemId) {
    return `/collections/${collectionId}/${itemId}/text`;
  },

  search(query, personal = false) {
    return query ? `/search?query=${encodeURIComponent(query)}${personal ? `&personal=${personal}` : ''}` : '/search';
  },

  searchResult(tab, slug) {
    switch (tab) {
      case 'games':
        return this.game(slug);
      case 'users':
        return this.profile(slug);
      case 'persons':
        return this.creator(slug);
      case 'collections':
        return this.collection(slug);
      case 'library':
        return this.game(slug);
      default:
        return '';
    }
  },

  notifications: '/notifications',

  reviews: '/reviews',
  reviewsBest: '/reviews',
  reviewCreate({ id, name, slug, redirect = true } = {}) {
    const redirectString = redirect ? 'true' : 'false';

    if (id && name && slug) {
      const gameString = objectToUrl({
        id,
        name,
        slug,
      });

      return `/reviews/create?game=${gameString}&redirect=${redirectString}`;
    }

    if (redirect !== null) {
      return `/reviews/create?redirect=${redirectString}`;
    }

    return '/reviews/create';
  },
  reviewEdit(id, redirect = true) {
    const redirectString = redirect ? 'true' : 'false';
    const url = `/reviews/${id}/edit`;

    if (redirect !== null) {
      return `${url}?redirect=${redirectString}`;
    }

    return url;
  },
  review(id) {
    return `/reviews/${id}`;
  },
  reviewComments(id) {
    return `/reviews/${id}#comments`;
  },
  reviewComment(reviewId, commentId, comment) {
    return `/reviews/${reviewId}?comment=${comment}#${commentId}`;
  },

  posts: '/posts',
  postCreate({ id, name, slug } = {}) {
    return id && name && slug
      ? `/posts/create?game=${encodeURIComponent(JSON.stringify({ id, name, slug }))}`
      : '/posts/create';
  },
  post(id) {
    return `/posts/${id}`;
  },
  postComments(id) {
    return `/posts/${id}#comments`;
  },
  postComment(postId, commentId, comment) {
    return `/posts/${postId}?comment=${comment}#${commentId}`;
  },
  postEdit(id) {
    return `/posts/${id}/edit`;
  },

  embeddedStories: '/embeds/stories',

  discover: '/discover',
  discoverSuggestions: (slug) => `/discover/games-like-${slug}`,
  discoverSection: (section) => `/discover/${section}`,

  leaderboard: '/leaderboard',
  sitemapIndex: '/html-sitemap',
  sitemap: (slug) => `/html-sitemap/${slug}`,

  svgImagePath(svg, visible = true) {
    if (visible) {
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }

    return '';
  },

  internalServerError: '/500',
  notFoundError: '/404',

  agreement: '/agreement',
  privacyPolicy: '/licence-users',
  privacy: '/privacy',
  tosApi: '/tos_api',
  terms: '/terms',
  agWelcomeBack: '/welcome-back',
  apidocs: '/apidocs',
  apiPurchaseSuccess: '/api-purchase-success',

  service: {
    ga: '/service/ga',
  },

  // Роуты для AG-версии сайта
  program: (id) => `/files/software/${id}`,

  giveawayRules: '/giveaway_rules',
  pay: '/pay',
};
