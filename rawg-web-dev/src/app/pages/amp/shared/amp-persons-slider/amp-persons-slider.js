import React from 'react';
import PropTypes from 'prop-types';
import AmpPersonsCard from './amp-persons-card';

const componentPropertyTypes = {
  className: PropTypes.string,
  persons: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const defaultProps = {
  className: '',
};

const GamePersonsSlider = ({ className, persons }) => (
  <div className={['game-persons-slider', className].join(' ')}>
    {persons.map((person, index) => (
      <AmpPersonsCard semantic="gamepage" person={person} key={person.id || index} />
    ))}
  </div>
);

GamePersonsSlider.propTypes = componentPropertyTypes;

GamePersonsSlider.defaultProps = defaultProps;

export default GamePersonsSlider;
