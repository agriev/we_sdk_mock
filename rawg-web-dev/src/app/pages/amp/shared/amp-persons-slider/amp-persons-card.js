import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import cn from 'classnames';

import paths from 'config/paths';
import AmpGameCard from '../amp-game-card-inline';

const componentPropertyTypes = {
  className: PropTypes.string,
  person: PropTypes.shape({
    slug: PropTypes.string,
    image: PropTypes.string,
    name: PropTypes.string,
    positions: PropTypes.array,
    games: PropTypes.array,
  }).isRequired,
};

const defaultProps = {
  className: '',
};

const GamePersonSliderCardPhone = ({ className, person }) => (
  <div className={['game-person-slider-card-phone', className].join(' ')}>
    <div className="game-person-slider-card-phone__header">
      <Link to={paths.creator(person.slug)} className="game-person-slider-card-phone__link">
        <p
          className={cn('game-person-slider-card-phone__name', {
            'game-person-slider-card-phone__image-empty': !person.image,
          })}
        >
          {person.name}
        </p>
      </Link>
      <p
        className={cn('game-person-slider-card-phone__position', {
          'game-person-slider-card-phone__position-empty': !person.image,
        })}
      >
        {Array.isArray(person.positions) &&
          person.positions.map((position) => position.name[0].toUpperCase() + position.name.slice(1)).join(', ')}
      </p>
    </div>
    {Array.isArray(person.games) && person.games.slice(0, 3).map((game) => <AmpGameCard game={game} key={game.id} />)}
  </div>
);

GamePersonSliderCardPhone.propTypes = componentPropertyTypes;
GamePersonSliderCardPhone.defaultProps = defaultProps;

export default GamePersonSliderCardPhone;
