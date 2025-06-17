import PropTypes from 'prop-types';
import { gameTypeObj } from 'app/pages/game/game.types';

export const achievementType = PropTypes.shape({
  id: PropTypes.number,
  name: PropTypes.string,
  percent: PropTypes.string,
  achieved: PropTypes.string,
  image: PropTypes.string,
  description: PropTypes.string,
  karma: PropTypes.number,
  type: PropTypes.string,
  game: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    slug: PropTypes.string,
  }),
});

export const earnedAchievementsType = PropTypes.shape({
  results: PropTypes.arrayOf(achievementType),
  count: PropTypes.number,
  next: PropTypes.number,
  previous: PropTypes.string,
  loading: PropTypes.bool,
});

export const recommendedGameType = PropTypes.shape({
  ...gameTypeObj,
  parent_achievements_count: PropTypes.number,
  percent: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  achievements: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      percent: PropTypes.string,
      achieved: PropTypes.string,
      image: PropTypes.string,
      description: PropTypes.string,
      karma: PropTypes.number,
      type: PropTypes.oneOf(['bronze', 'silver', 'gold']),
      game: PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
        slug: PropTypes.string,
      }),
    }),
  ),
});

export const recommendedGamesType = PropTypes.shape({
  count: PropTypes.number,
  next: PropTypes.number,
  previous: PropTypes.string,
  results: PropTypes.arrayOf(recommendedGameType),
  loading: PropTypes.bool,
});

export const leaderboardPositionType = PropTypes.shape({
  karma: PropTypes.number,
  achievements: PropTypes.number,
  achievements_gold: PropTypes.number,
  achievements_silver: PropTypes.number,
  achievements_bronze: PropTypes.number,
  position: PropTypes.number,
  position_yesterday: PropTypes.number,
  user: PropTypes.shape({
    id: PropTypes.number,
    username: PropTypes.string,
    slug: PropTypes.string,
    full_name: PropTypes.string,
    avatar: PropTypes.string,
    games_count: PropTypes.number,
    collections_count: PropTypes.number,
    followers_count: PropTypes.number,
  }),
});

export const leaderboardFirstType = PropTypes.shape({
  count: PropTypes.number,
  next: PropTypes.number,
  previous: PropTypes.string,
  results: PropTypes.arrayOf(leaderboardPositionType),
  loading: PropTypes.bool,
});

export const leaderboardUserType = PropTypes.shape({
  count: PropTypes.number,
  next: PropTypes.number,
  previous: PropTypes.string,
  results: PropTypes.arrayOf(leaderboardPositionType),
  loading: PropTypes.bool,
});

export const leaderboardType = PropTypes.shape({
  first: leaderboardFirstType,
  user: leaderboardUserType,
});

export const lastAchievementType = PropTypes.shape({
  id: PropTypes.number,
  user: PropTypes.shape({
    id: PropTypes.number,
    username: PropTypes.string,
    slug: PropTypes.string,
    full_name: PropTypes.string,
    avatar: PropTypes.string,
    games_count: PropTypes.number,
    collections_count: PropTypes.number,
    followers_count: PropTypes.number,
  }),
  achieved: PropTypes.string,
  name: PropTypes.string,
  description: PropTypes.string,
  karma: PropTypes.number,
  loading: PropTypes.bool,
});

export const rewardType = PropTypes.shape({
  your_top: PropTypes.number,
  tokens: PropTypes.number,
  users: PropTypes.number,
  exchange_until: PropTypes.string,
  your_karma: PropTypes.number,
  your_tokens: PropTypes.number,
});

const tokensDashboardDataTypes = PropTypes.shape({
  earnedAchievements: earnedAchievementsType,
  recommendedGames: recommendedGamesType,
  leaderboard: leaderboardType,
  lastAchievement: lastAchievementType,
});

export default tokensDashboardDataTypes;
