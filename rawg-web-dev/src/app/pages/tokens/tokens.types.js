/* eslint-disable camelcase */

import PropTypes from 'prop-types';

export const STATUS_NEW = 'new';
export const STATUS_ACTIVE = 'active';
export const STATUS_COMPLETED = 'completed';
export const STATUS_FAILURE = 'failure';

export const id = PropTypes.number;
export const start = PropTypes.string; // дата начала
export const end = PropTypes.string; // дата конца
export const achievements = PropTypes.number; // кол-во выбитых ачивок на текущий момент
export const percent = PropTypes.number; // на какой процент завершена программа
export const joined = PropTypes.number; // кол-во юзеров в программе
export const finished = PropTypes.string; // когда завершился текущий цикл

// идёт процесс подписки на оповещение о начале следующего цикла?
export const subscribing = PropTypes.bool;
export const loading = PropTypes.bool;

// текущий статус программы
export const status = PropTypes.oneOf([STATUS_ACTIVE, STATUS_COMPLETED, STATUS_FAILURE, STATUS_NEW]);

// рубежи с кол-вом ачивок и токенов
export const stages = PropTypes.arrayOf(
  PropTypes.shape({
    achievements: PropTypes.number,
    tokens: PropTypes.number,
    achieved: PropTypes.bool,
  }),
);

// когда будет следующий цикл (теоретически может быть null, но наверное никогда не будет)
export const next = PropTypes.shape({
  id: PropTypes.number,
  start: PropTypes.string,
  end: PropTypes.string,
  achievements: PropTypes.number,
  percent: PropTypes.number,
  status,
});

// последние пользователи (чтобы показывать аватарки), сейчас ограничено 5 юзерами
export const last_users = PropTypes.arrayOf(
  PropTypes.shape({
    id: PropTypes.number,
    username: PropTypes.string,
    slug: PropTypes.string,
    full_name: PropTypes.string,
    avatar: PropTypes.string,
    games_count: PropTypes.number,
    collections_count: PropTypes.number,
    followers_count: PropTypes.number,
  }),
);

// если пользователь авторизован, то есть это поле, тут есть карма, кол-во ачивок
// всего и разных типов, позиция и позиция вчера. это поле есть даже когда пользователь
// незаджойнен (если захотим показывать мотивационную плашку для них например), тогда
// там всё будет по нулям, а позиции будут последнее
export const current_user = PropTypes.shape({
  karma: PropTypes.number,
  achievements: PropTypes.number,
  achievements_gold: PropTypes.number,
  achievements_silver: PropTypes.number,
  achievements_bronze: PropTypes.number,
  position: PropTypes.number,
  position_yesterday: PropTypes.number,
});

export const offers = PropTypes.shape({
  count: PropTypes.number,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      cost: PropTypes.number,
    }),
  ),
});

const tokensDashboardTypes = PropTypes.shape({
  id,
  start,
  end,
  achievements,
  percent,
  status,
  stages,
  next,
  joined,
  finished,
  last_users,
  current_user,
  subscribing,
  loading,
  offers,
});

export default tokensDashboardTypes;
