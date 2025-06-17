import PropTypes from 'prop-types';

import {
  currentUserIdType,
  currentUserSlugType,
  username as userNameType,
  full_name as userFullnameType,
  avatar as userAvatarType,
  games_count as userGamesCountType,
  collections_count as userCollectionsCountType,
} from 'app/components/current-user/current-user.types';

import {
  id as gameIdType,
  slug as gameSlugType,
  name as gameNameType,
  released as gameReleasedType,
  platforms as gamePlatformsType,
  genres as gameGenresType,
  dominant_color as gameDominantColorType,
  saturated_color as gameSaturatedColorType,
  background_image as gameBackgroundImageType,
  rating_top as gameRatingTopType,
  ratings as gameRatingsType,
  added as gameAddedType,
  user_game as gameUserGameType,
  user_review as gameUserReviewType,
  parent_platforms as gameParentPlatformsType,
  reviews_count as gameReviewsCountType,
  chartsFull as gameChartsFullType,
} from 'app/pages/game/game.types';

const users = PropTypes.shape({
  count: PropTypes.number,
  status: PropTypes.string,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: currentUserIdType,
      slug: currentUserSlugType,
      username: userNameType,
      full_name: userFullnameType,
      avatar: userAvatarType,
      games_count: userGamesCountType,
      collections_count: userCollectionsCountType,
    }),
  ),
});

export const featured = PropTypes.shape({
  count: PropTypes.number,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: gameIdType,
      slug: gameSlugType,
      name: gameNameType,
      released: gameReleasedType,
      platforms: gamePlatformsType,
      genres: gameGenresType,
      dominant_color: gameDominantColorType,
      saturated_color: gameSaturatedColorType,
      background_image: gameBackgroundImageType,
      rating_top: gameRatingTopType,
      ratings: gameRatingsType,
      added: gameAddedType,
      user_game: gameUserGameType,
      user_review: gameUserReviewType,
      parent_platforms: gameParentPlatformsType,
      reviews_count: gameReviewsCountType,
    }),
  ),
});

export const current = PropTypes.shape({
  count: PropTypes.number,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: gameIdType,
      slug: gameSlugType,
      name: gameNameType,
      released: gameReleasedType,
      platforms: gamePlatformsType,
      dominant_color: gameDominantColorType,
      saturated_color: gameSaturatedColorType,
      background_image: gameBackgroundImageType,
      rating_top: gameRatingTopType,
      ratings: gameRatingsType,
      added: gameAddedType,
      charts: gameChartsFullType,
      user_game: gameUserGameType,
      user_review: gameUserReviewType,
      parent_platforms: gameParentPlatformsType,
      reviews_count: gameReviewsCountType,
    }),
  ),
});

export const trend = PropTypes.shape({
  id: gameIdType,
  slug: gameSlugType,
  name: gameNameType,
  released: gameReleasedType,
  platforms: gamePlatformsType,
  dominant_color: gameDominantColorType,
  saturated_color: gameSaturatedColorType,
  background_image: gameBackgroundImageType,
  rating_top: gameRatingTopType,
  ratings: gameRatingsType,
  added: gameAddedType,
  charts: gameChartsFullType,
  user_game: gameUserGameType,
  user_review: gameUserReviewType,
  parent_platforms: gameParentPlatformsType,
  reviews_count: gameReviewsCountType,
  users,
});

export const trends = PropTypes.shape({
  count: PropTypes.number,
  results: PropTypes.arrayOf(trend),
});

export const recentType = PropTypes.shape({
  current: PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.string),
    count: PropTypes.number,
    loading: PropTypes.bool,
  }),
  future: PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.string),
    count: PropTypes.number,
    loading: PropTypes.bool,
  }),
  past: PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.string),
    count: PropTypes.number,
    loading: PropTypes.bool,
  }),
});

export const imgur = PropTypes.shape({
  results: PropTypes.array,
  count: PropTypes.number,
});

export const persons = PropTypes.shape({
  count: PropTypes.number,
  next: PropTypes.string,
  previous: PropTypes.string,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      //
    }),
  ),
});

export const collections = PropTypes.shape({
  count: PropTypes.number,
  next: PropTypes.string,
  previous: PropTypes.string,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      //
    }),
  ),
});

const ShowcaseType = PropTypes.shape({
  featured,
  current,
  trends,
  imgur,
  persons,
  collections,
  recent: recentType,
});

export default ShowcaseType;
