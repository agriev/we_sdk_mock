/* eslint-disable camelcase */

import PropTypes from 'prop-types';

export const currentUserIdType = PropTypes.oneOfType([PropTypes.number, PropTypes.string]);
export const username = PropTypes.string;
export const full_name = PropTypes.string;
export const avatar = PropTypes.string;
export const is_active = PropTypes.bool;
export const connections = PropTypes.array;

export const games_count = PropTypes.number; // Общее кол-во игр пользователя, включая игры в вишлисте
export const games_wishlist_count = PropTypes.number; // Кол-во игр в вишлисте пользователя

export const collections_count = PropTypes.number;
export const bio = PropTypes.string;
export const email = PropTypes.string;
export const currentUserSlugType = PropTypes.string;
export const reviews_count = PropTypes.number;
export const comments_count = PropTypes.number;
export const last_login = PropTypes.string;
export const date_joined = PropTypes.string;
export const steam_id = PropTypes.string;
export const steam_id_status = PropTypes.string;
export const steam_id_date = PropTypes.string;
export const steam_id_confirm = PropTypes.bool;
export const gamer_tag = PropTypes.string;
export const gamer_tag_status = PropTypes.string;
export const gamer_tag_date = PropTypes.string;
export const gamer_tag_confirm = PropTypes.bool;
export const psn_online_id = PropTypes.string;
export const psn_online_id_status = PropTypes.string;
export const psn_online_id_date = PropTypes.string;
export const psn_online_id_confirm = PropTypes.bool;
export const gog = PropTypes.string;
export const gog_date = PropTypes.string;
export const gog_locked = PropTypes.bool;
export const gog_status = PropTypes.string;
export const game_background = PropTypes.shape({
  dominant_color: PropTypes.string,
  saturated_color: PropTypes.string,
  url: PropTypes.string,
});
export const followers_count = PropTypes.number;
export const following_count = PropTypes.number;
export const share_image = PropTypes.string;
export const subscribe_mail_synchronization = PropTypes.bool;
export const select_platform = PropTypes.bool;
export const following = PropTypes.bool;
export const bio_raw = PropTypes.string;
export const steam_id_locked = PropTypes.bool;
export const gamer_tag_locked = PropTypes.bool;
export const psn_online_id_locked = PropTypes.bool;
export const email_confirmed = PropTypes.bool;
export const set_password = PropTypes.bool;
export const token_program = PropTypes.bool;
export const tokens = PropTypes.oneOfType([PropTypes.number, PropTypes.string]);
export const has_confirmed_accounts = PropTypes.bool;
export const is_staff = PropTypes.bool; // Это администратор с расширенными правами?

// Этот пользователь имеет право на расширенное редактирование игр?
export const is_editor = PropTypes.bool;

export const settingsType = PropTypes.shape();
export const ratedGamesPercentType = PropTypes.number;

const currentUserType = PropTypes.shape({
  id: currentUserIdType,
  slug: currentUserSlugType,
  username,
  full_name,
  avatar,
  is_active,
  connections,
  games_count,
  games_wishlist_count,
  collections_count,
  bio,
  email,
  reviews_count,
  comments_count,
  last_login,
  date_joined,
  steam_id,
  steam_id_status,
  steam_id_date,
  steam_id_confirm,
  gamer_tag,
  gamer_tag_status,
  gamer_tag_date,
  gamer_tag_confirm,
  gog,
  gog_date,
  gog_locked,
  gog_status,
  psn_online_id,
  psn_online_id_status,
  psn_online_id_date,
  psn_online_id_confirm,
  has_confirmed_accounts,
  game_background,
  followers_count,
  following_count,
  share_image,
  subscribe_mail_synchronization,
  select_platform,
  following,
  bio_raw,
  steam_id_locked,
  gamer_tag_locked,
  psn_online_id_locked,
  email_confirmed,
  set_password,
  tokens,
  token_program,
  is_staff,
  is_editor,
  settings: settingsType,
  rated_games_percent: ratedGamesPercentType,
});

export default currentUserType;
