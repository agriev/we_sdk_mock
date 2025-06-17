/* eslint-disable camelcase */

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
  name as gameNameType,
  slug as gameSlugType,
  ratings as gameRatingsType,
  dominant_color as gameDominantColorType,
  saturated_color as gameSaturatedColorType,
  rating_top as gameRatingTopType,
  background_image as gameBackgroundImageType,
  released as gameReleasedType,
  metacritic as gameMetacriticType,
  added as gameAddedType,
  user_game as gameUserGameType,
  reviews_count as gameReviewsCountType,
  reviews_users as gameReviewsUsersType,
} from 'app/pages/game/game.types';

export const id = PropTypes.oneOfType([PropTypes.number, PropTypes.string]);
export const text = PropTypes.string;
export const rating = PropTypes.number;
export const reactions = PropTypes.arrayOf(
  PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.shape({
      id: PropTypes.number,
      positive: PropTypes.bool,
      title: PropTypes.string,
    }),
  ]),
);
export const loading = PropTypes.bool;
export const errors = PropTypes.shape();
export const text_preview = PropTypes.string;
export const text_previews = PropTypes.array;
export const text_attachments = PropTypes.number;
export const created = PropTypes.string;
export const edited = PropTypes.string;
export const likes_count = PropTypes.number;
export const likes_positive = PropTypes.number;
export const likes_rating = PropTypes.number;
export const comments_count = PropTypes.number;
export const posts_count = PropTypes.number;
export const share_image = PropTypes.string;
export const user_like = PropTypes.bool;
export const user_post = PropTypes.bool;
export const can_delete = PropTypes.bool;

export const game = PropTypes.oneOfType([
  PropTypes.number,
  PropTypes.shape({
    id: gameIdType,
    slug: gameSlugType,
    name: gameNameType,
    ratings: gameRatingsType,
    dominant_color: gameDominantColorType,
    saturated_color: gameSaturatedColorType,
    rating_top: gameRatingTopType,
    background_image: gameBackgroundImageType,
    released: gameReleasedType,
    metacritic: gameMetacriticType,
    added: gameAddedType,
    user_game: gameUserGameType,
    reviews_count: gameReviewsCountType,
    reviews_users: gameReviewsUsersType,
  }),
]);

const user = PropTypes.shape({
  id: currentUserIdType,
  username: userNameType,
  slug: currentUserSlugType,
  full_name: userFullnameType,
  avatar: userAvatarType,
  games_count: userGamesCountType,
  collections_count: userCollectionsCountType,
});

const reviewType = PropTypes.shape({
  id,
  text,
  rating,
  reactions,
  game,
  user,
  loading,
  errors,
  text_preview,
  text_previews,
  text_attachments,
  created,
  edited,
  likes_count,
  likes_positive,
  likes_rating,
  comments_count,
  posts_count,
  share_image,
  user_like,
  user_post,
  can_delete,
});

export default reviewType;
