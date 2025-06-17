import PropTypes from 'prop-types';

import {
  id as idGameType,
  slug as slugGameType,
  name as nameGameType,
  user_game as userGameType,
  platforms as platformsGameType,
  parent_platforms as parentPlatformsGameType,
  rating_top as ratingTopGameType,
} from 'app/pages/game/game.types';

export const loadingType = PropTypes.bool;
export const groupsType = PropTypes.arrayOf(
  PropTypes.shape({
    has_new_games: PropTypes.bool,
    background: PropTypes.string,
    name: PropTypes.string,
    slug: PropTypes.string,
    videos: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string.isRequired,
        preview: PropTypes.string.isRequired,
        second: PropTypes.number.isRequired,
        video: PropTypes.string.isRequired,
        game: PropTypes.shape({
          id: idGameType,
          slug: slugGameType,
          name: nameGameType,
          user_game: userGameType,
          platforms: platformsGameType,
          parent_platforms: parentPlatformsGameType,
          rating_top: ratingTopGameType,
        }),
      }),
    ),
  }),
);

const storiesType = PropTypes.shape({
  loading: loadingType,
  groups: groupsType,
});

export default storiesType;
