/* eslint-disable sonarjs/no-duplicate-string */

import contains from 'ramda/src/contains';
import __ from 'ramda/src/__';

import getPreviousYear from 'tools/dates/previous-year';

export const DISCOVER_SEC_MAIN = 'main';

export const DISCOVER_SEC_RECENT_PAST = 'last-30-days';
export const DISCOVER_SEC_RECENT_CURRENT = 'this-week';
export const DISCOVER_SEC_RECENT_FUTURE = 'next-week';

export const DISCOVER_SEC_GAMES_LIKE = 'games-like';

export const DISCOVER_SEC_BEST = 'best-of-the-year';
export const DISCOVER_SEC_TOP_RATED = `popular-in-${getPreviousYear()}`;
export const DISCOVER_SEC_ALL_TIME = 'all-time-top';

export const DISCOVER_SEC_WISHLIST = 'wishlist';
export const DISCOVER_SEC_FRIENDS = 'friends';
export const DISCOVER_SEC_LIBRARY = 'my-library';
export const DISCOVER_SEC_LIBRARY_UNCATEGORIZED = 'my-library/uncategorized';
export const DISCOVER_SEC_LIBRARY_PLAYING = 'my-library/playing';
export const DISCOVER_SEC_LIBRARY_COMPLETED = 'my-library/completed';
export const DISCOVER_SEC_LIBRARY_PLAYED = 'my-library/played';
export const DISCOVER_SEC_LIBRARY_NOTPLAYED = 'my-library/notplayed';

export const DISCOVER_SEC_PC = 'pc';
export const DISCOVER_SEC_PS4 = 'ps4';
export const DISCOVER_SEC_XBOX_ONE = 'xbox-one';
export const DISCOVER_SEC_NINTENDO_SWITCH = 'switch';
export const DISCOVER_SEC_IOS = 'ios';
export const DISCOVER_SEC_ANDROID = 'android';

export const DISCOVER_SEC_ACTION = 'action';
export const DISCOVER_SEC_STRATEGY = 'strategy';
export const DISCOVER_SEC_RPG = 'rpg';
export const DISCOVER_SEC_SHOOTER = 'shooter';
export const DISCOVER_SEC_ADVENTURE = 'adventure';
export const DISCOVER_SEC_PUZZLE = 'puzzle';
export const DISCOVER_SEC_RACING = 'racing';
export const DISCOVER_SEC_SPORTS = 'sports';

export const DISCOVER_SEC_COLLECTIONS = 'collections';
export const DISCOVER_SEC_REVIEWS = 'reviews';
export const DISCOVER_SEC_TAGS = 'tags';
export const DISCOVER_SEC_PLATFORMS = 'platforms';
export const DISCOVER_SEC_GENRES = 'genres';
export const DISCOVER_SEC_CREATORS = 'creators';
export const DISCOVER_SEC_DEVELOPERS = 'developers';
export const DISCOVER_SEC_PUBLISHERS = 'publishers';
export const DISCOVER_SEC_STORES = 'stores';

export const DISCOVER_SEC_CALENDAR = 'calendar';

export const defaultSection = DISCOVER_SEC_MAIN;

export const librarySections = [
  DISCOVER_SEC_LIBRARY,
  DISCOVER_SEC_LIBRARY_UNCATEGORIZED,
  DISCOVER_SEC_LIBRARY_PLAYING,
  DISCOVER_SEC_LIBRARY_COMPLETED,
  DISCOVER_SEC_LIBRARY_PLAYED,
  DISCOVER_SEC_LIBRARY_NOTPLAYED,
];

export const privateSections = [
  DISCOVER_SEC_WISHLIST,
  DISCOVER_SEC_LIBRARY,
  DISCOVER_SEC_LIBRARY_UNCATEGORIZED,
  DISCOVER_SEC_LIBRARY_PLAYING,
  DISCOVER_SEC_LIBRARY_COMPLETED,
  DISCOVER_SEC_LIBRARY_PLAYED,
  DISCOVER_SEC_LIBRARY_NOTPLAYED,
  DISCOVER_SEC_FRIENDS,
];

export const RecentPaths = {
  current: DISCOVER_SEC_RECENT_CURRENT,
  future: DISCOVER_SEC_RECENT_FUTURE,
  past: DISCOVER_SEC_RECENT_PAST,
};

export const TopPaths = {
  best: DISCOVER_SEC_BEST,
  topRated: DISCOVER_SEC_TOP_RATED,
  allTime: DISCOVER_SEC_ALL_TIME,
};

export const UsersPaths = {
  wishlist: DISCOVER_SEC_WISHLIST,
  library: DISCOVER_SEC_LIBRARY,
  friends: DISCOVER_SEC_FRIENDS,
};

export const BrowsePaths = {
  collections: DISCOVER_SEC_COLLECTIONS,
  reviews: DISCOVER_SEC_REVIEWS,
  tags: DISCOVER_SEC_TAGS,
  platforms: DISCOVER_SEC_PLATFORMS,
  genres: DISCOVER_SEC_GENRES,
  creators: DISCOVER_SEC_CREATORS,
  developers: DISCOVER_SEC_DEVELOPERS,
  publishers: DISCOVER_SEC_PUBLISHERS,
  stores: DISCOVER_SEC_STORES,
};

export const PlatformsPaths = {
  pc: DISCOVER_SEC_PC,
  playstation: DISCOVER_SEC_PS4,
  nintendo: DISCOVER_SEC_NINTENDO_SWITCH,
  xbox: DISCOVER_SEC_XBOX_ONE,
  ios: DISCOVER_SEC_IOS,
  android: DISCOVER_SEC_ANDROID,
};

export const GenresPaths = {
  action: DISCOVER_SEC_ACTION,
  strategy: DISCOVER_SEC_STRATEGY,
  rpg: DISCOVER_SEC_RPG,
  shooter: DISCOVER_SEC_SHOOTER,
  adventure: DISCOVER_SEC_ADVENTURE,
  puzzle: DISCOVER_SEC_PUZZLE,
  racing: DISCOVER_SEC_RACING,
  sports: DISCOVER_SEC_SPORTS,
};

export const headingsId = {
  [DISCOVER_SEC_MAIN]: 'discover.main',
  [DISCOVER_SEC_RECENT_CURRENT]: 'discover.this_week',
  [DISCOVER_SEC_RECENT_FUTURE]: 'discover.next_week',
  [DISCOVER_SEC_RECENT_PAST]: 'discover.last_30_days',
  [DISCOVER_SEC_BEST]: 'discover.best_of_the_year',
  [DISCOVER_SEC_TOP_RATED]: 'discover.top_rated',
  [DISCOVER_SEC_ALL_TIME]: 'discover.all_time_top',
  [DISCOVER_SEC_WISHLIST]: 'game-statuses.wishlist',
  [DISCOVER_SEC_LIBRARY]: 'discover.my_library',
  [DISCOVER_SEC_LIBRARY_COMPLETED]: 'discover.my_library',
  [DISCOVER_SEC_LIBRARY_NOTPLAYED]: 'discover.my_library',
  [DISCOVER_SEC_LIBRARY_PLAYED]: 'discover.my_library',
  [DISCOVER_SEC_LIBRARY_PLAYING]: 'discover.my_library',
  [DISCOVER_SEC_LIBRARY_UNCATEGORIZED]: 'discover.my_library',
  [DISCOVER_SEC_FRIENDS]: 'discover.friends',
  [DISCOVER_SEC_PC]: 'discover.pc',
  [DISCOVER_SEC_PS4]: 'discover.playstation',
  [DISCOVER_SEC_XBOX_ONE]: 'discover.xbox',
  [DISCOVER_SEC_NINTENDO_SWITCH]: 'discover.nintendo',
  [DISCOVER_SEC_IOS]: 'discover.ios',
  [DISCOVER_SEC_ANDROID]: 'discover.android',
  [DISCOVER_SEC_ACTION]: 'discover.action',
  [DISCOVER_SEC_STRATEGY]: 'discover.strategy',
  [DISCOVER_SEC_RPG]: 'discover.rpg',
  [DISCOVER_SEC_SHOOTER]: 'discover.shooter',
  [DISCOVER_SEC_ADVENTURE]: 'discover.adventure',
  [DISCOVER_SEC_PUZZLE]: 'discover.puzzle',
  [DISCOVER_SEC_RACING]: 'discover.racing',
  [DISCOVER_SEC_SPORTS]: 'discover.sports',
  [DISCOVER_SEC_COLLECTIONS]: 'discover.collections',
  [DISCOVER_SEC_REVIEWS]: 'discover.reviews',
  [DISCOVER_SEC_TAGS]: 'discover.tags',
  [DISCOVER_SEC_PLATFORMS]: 'discover.platforms',
  [DISCOVER_SEC_GENRES]: 'discover.genres',
  [DISCOVER_SEC_CREATORS]: 'discover.creators',
  [DISCOVER_SEC_DEVELOPERS]: 'discover.developers',
  [DISCOVER_SEC_PUBLISHERS]: 'discover.publishers',
  [DISCOVER_SEC_STORES]: 'discover.stores',
};

export const isLibrarySection = contains(__, librarySections);

export const isPrivateSection = contains(__, privateSections);
