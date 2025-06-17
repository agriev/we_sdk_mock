import paths from 'config/paths';
import trans from 'tools/trans';
import getPreviousYear from 'tools/dates/previous-year';
import getCurrentYear from 'tools/dates/current-year';

import { getPlatformIcon } from 'app/pages/game/game.helper';
import {
  headingsId,
  RecentPaths,
  TopPaths,
  PlatformsPaths,
  GenresPaths,
  UsersPaths,
  BrowsePaths,
  DISCOVER_SEC_REVIEWS,
} from 'app/pages/discover/discover.sections';

import starIcon from 'assets/icons/star.svg';
import fireIcon from 'assets/icons/fire.svg';
import nextIcon from 'assets/icons/next.svg';
import calendarIcon from 'assets/icons/calendar-2.svg';
import trophyIcon from 'assets/icons/trophy.svg';
import chartIcon from 'assets/icons/chart-2.svg';
import crownIcon from 'assets/icons/crown.svg';
import wishlistIcon from 'assets/icons/icon-game-wishlist-white.svg';
import libraryIcon from 'assets/icons/icon-game-my-games.svg';
import friendsIcon from 'assets/icons/friends.svg';
import collectionIcon from 'assets/icons/folder.svg';
import reviewsIcon from 'assets/icons/review.svg';
import tagsIcon from 'assets/icons/tags.svg';
import platformsIcon from 'assets/icons/gamepad.svg';
import storesIcon from 'assets/icons/stores.svg';
import genresIcon from 'assets/icons/ghost.svg';
import creatorsIcon from 'assets/icons/creators.svg';
import developersIcon from 'assets/icons/developers.svg';
import publishersIcon from 'assets/icons/publishers.svg';

import actionImage from './assets/action.png';
import adventureImage from './assets/adventure.png';
import puzzleImage from './assets/puzzle.png';
import racingImage from './assets/racing.png';
import rpgImage from './assets/rpg.png';
import shooterImage from './assets/shooter.png';
import sportsImage from './assets/sports.png';
import strategyImage from './assets/strategy.png';

export const newReleases = [
  {
    key: headingsId[RecentPaths.past],
    name: trans(headingsId[RecentPaths.past]),
    icon: starIcon,
    path: paths.discoverSection(RecentPaths.past),
  },
  {
    key: headingsId[RecentPaths.current],
    name: trans(headingsId[RecentPaths.current]),
    icon: fireIcon,
    path: paths.discoverSection(RecentPaths.current),
  },
  {
    key: headingsId[RecentPaths.future],
    name: trans(headingsId[RecentPaths.future]),
    icon: nextIcon,
    iconClassName: 'next',
    path: paths.discoverSection(RecentPaths.future),
  },
  {
    key: 'release-dates',
    name: trans('calendar.sidebar-title'),
    icon: calendarIcon,
    iconClassName: 'calendar',
    path: paths.releaseDates,
  },
];

export const top = [
  {
    key: headingsId[TopPaths.best],
    name: trans(headingsId[TopPaths.best], { currentYear: getCurrentYear() }),
    icon: trophyIcon,
    path: paths.discoverSection(TopPaths.best),
  },
  {
    key: headingsId[TopPaths.topRated],
    name: trans(headingsId[TopPaths.topRated], { previousYear: getPreviousYear() }),
    icon: chartIcon,
    iconClassName: 'year-top',
    path: paths.discoverSection(TopPaths.topRated),
  },
  {
    key: headingsId[TopPaths.allTime],
    name: trans(headingsId[TopPaths.allTime]),
    icon: crownIcon,
    iconClassName: 'all-time-top',
    path: paths.discoverSection(TopPaths.allTime),
  },
];

export const user = [
  {
    key: headingsId[UsersPaths.wishlist],
    name: trans(headingsId[UsersPaths.wishlist]),
    icon: wishlistIcon,
    iconClassName: 'wishlist',
    path: paths.discoverSection(UsersPaths.wishlist),
  },
  {
    key: headingsId[UsersPaths.library],
    name: trans(headingsId[UsersPaths.library]),
    icon: libraryIcon,
    iconClassName: 'library',
    path: paths.discoverSection(UsersPaths.library),
  },
  {
    key: headingsId[UsersPaths.friends],
    name: trans(headingsId[UsersPaths.friends]),
    icon: friendsIcon,
    iconClassName: 'friends',
    path: paths.discoverSection(UsersPaths.friends),
  },
];

export const platforms = [
  {
    key: headingsId[PlatformsPaths.pc],
    name: trans(headingsId[PlatformsPaths.pc]),
    icon: getPlatformIcon('pc'),
    iconClassName: 'pc',
    path: paths.platform('pc'),
  },
  {
    key: headingsId[PlatformsPaths.playstation],
    name: trans(headingsId[PlatformsPaths.playstation]),
    icon: getPlatformIcon('playstation'),
    path: paths.platform('playstation4'),
  },
  {
    key: headingsId[PlatformsPaths.xbox],
    name: trans(headingsId[PlatformsPaths.xbox]),
    icon: getPlatformIcon('xbox'),
    path: paths.platform('xbox-one'),
  },
  {
    key: headingsId[PlatformsPaths.nintendo],
    name: trans(headingsId[PlatformsPaths.nintendo]),
    icon: getPlatformIcon('nintendo'),
    path: paths.platform('nintendo-switch'),
  },
  {
    key: headingsId[PlatformsPaths.ios],
    name: trans(headingsId[PlatformsPaths.ios]),
    icon: getPlatformIcon('ios'),
    path: paths.platform('ios'),
  },
  {
    key: headingsId[PlatformsPaths.android],
    name: trans(headingsId[PlatformsPaths.android]),
    icon: getPlatformIcon('android'),
    path: paths.platform('android'),
  },
];

export const browse = [
  {
    key: headingsId[BrowsePaths.platforms],
    name: trans(headingsId[BrowsePaths.platforms]),
    icon: platformsIcon,
    path: paths.platforms,
  },
  {
    key: headingsId[BrowsePaths.stores],
    name: trans(headingsId[BrowsePaths.stores]),
    icon: storesIcon,
    path: paths.stores,
  },
  {
    key: headingsId[BrowsePaths.collections],
    name: trans(headingsId[BrowsePaths.collections]),
    icon: collectionIcon,
    path: paths.collectionsPopular,
  },
  {
    key: headingsId[BrowsePaths.reviews],
    name: trans(headingsId[BrowsePaths.reviews]),
    icon: reviewsIcon,
    path: paths.reviewsBest,
  },
  {
    key: headingsId[BrowsePaths.genres],
    name: trans(headingsId[BrowsePaths.genres]),
    icon: genresIcon,
    path: paths.genres,
  },
  {
    key: headingsId[BrowsePaths.creators],
    name: trans(headingsId[BrowsePaths.creators]),
    icon: creatorsIcon,
    path: paths.creators,
  },
  {
    key: headingsId[BrowsePaths.tags],
    name: trans(headingsId[BrowsePaths.tags]),
    icon: tagsIcon,
    path: paths.tags,
  },
  {
    key: headingsId[BrowsePaths.developers],
    name: trans(headingsId[BrowsePaths.developers]),
    icon: developersIcon,
    path: paths.developers,
  },
  {
    key: headingsId[BrowsePaths.publishers],
    name: trans(headingsId[BrowsePaths.publishers]),
    icon: publishersIcon,
    path: paths.publishers,
  },
];

export const genres = [
  {
    key: headingsId[GenresPaths.action],
    name: trans(headingsId[GenresPaths.action]),
    image: actionImage,
    path: paths.genre('action'),
  },
  {
    key: headingsId[GenresPaths.strategy],
    name: trans(headingsId[GenresPaths.strategy]),
    image: strategyImage,
    path: paths.genre('strategy'),
  },
  {
    key: headingsId[GenresPaths.rpg],
    name: trans(headingsId[GenresPaths.rpg]),
    image: rpgImage,
    path: paths.genre('role-playing-games-rpg'),
  },
  {
    key: headingsId[GenresPaths.shooter],
    name: trans(headingsId[GenresPaths.shooter]),
    image: shooterImage,
    path: paths.genre('shooter'),
  },
  {
    key: headingsId[GenresPaths.adventure],
    name: trans(headingsId[GenresPaths.adventure]),
    image: adventureImage,
    path: paths.genre('adventure'),
  },
  {
    key: headingsId[GenresPaths.puzzle],
    name: trans(headingsId[GenresPaths.puzzle]),
    image: puzzleImage,
    path: paths.genre('puzzle'),
  },
  {
    key: headingsId[GenresPaths.racing],
    name: trans(headingsId[GenresPaths.racing]),
    image: racingImage,
    path: paths.genre('racing'),
  },
  {
    key: headingsId[GenresPaths.sports],
    name: trans(headingsId[GenresPaths.sports]),
    image: sportsImage,
    path: paths.genre('sports'),
  },
];

const homeLogged = {
  key: 'discover.main_logged',
  name: trans('discover.main_logged'),
  subtitle: trans('discover.main_subtitle_logged'),
  path: paths.index,
};

const homeGuest = {
  key: 'discover.main_guest',
  name: trans('discover.main_guest'),
  subtitle: trans('discover.main_subtitle_guest'),
  path: paths.index,
};

const allGames = {
  key: 'games',
  name: trans('discover.all-games'),
  path: paths.games,
};

const reviews = {
  key: headingsId[DISCOVER_SEC_REVIEWS],
  name: trans(headingsId[DISCOVER_SEC_REVIEWS]),
  path: paths.reviewsBest,
};

export const commonSections = [...newReleases, ...top, ...platforms, ...genres, ...browse];

export const loggedSections = [homeLogged, allGames, reviews, ...user, ...commonSections];
export const guestSections = [homeGuest, allGames, reviews, ...commonSections];

export const getAllSections = (currentUser) => {
  if (currentUser.id) {
    return loggedSections;
  }

  return guestSections;
};
