import React from 'react';
import PropTypes from 'prop-types';

import trans from 'tools/trans';

import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';

import Avatar from 'app/ui/avatar';
import CardTemplate from 'app/components/card-template';

import './person-slider-card.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  person: PropTypes.shape({}).isRequired,
  size: PropTypes.string.isRequired,
  isEmpty: PropTypes.bool,
};

const defaultProps = {
  className: '',
  isEmpty: false,
};

const PersonSliderCardEmpty = () => (
  <div className="persons-slider-card__empty-container">
    <div className="persons-slider-card__empty-circle" />
    <div className="persons-slider-card__empty-first" />
    <div className="persons-slider-card__empty-second" />
  </div>
);

const getPersonCardData = (person, isDesktop) => ({
  image: person.image ? <Avatar size={isDesktop ? 128 : 96} src={person.image} /> : null,
  backgroundImage: person.image_background,
  heading: { text: person.name, path: paths.creator(person.slug) },
  headingNotice: Array.isArray(person.positions)
    ? person.positions.map((position) => position.name[0].toUpperCase() + position.name.slice(1)).join(', ')
    : null,
  itemsHeading: {
    text: trans('person.known_title'),
    count: `${person.games_count} games`,
  },
  items: person.games.map((game) => ({
    path: paths.game(game.slug),
    text: game.name,
    count: game.added,
    countWithIcon: true,
  })),
  titleCentred: false,
  withImage: true,
});

const PersonSliderCard = ({ className, person, isEmpty, size }) =>
  !isEmpty ? (
    <div className="persons-slider-card">
      <CardTemplate className={className} {...getPersonCardData(person, appHelper.isDesktopSize({ size }))} />
    </div>
  ) : (
    <PersonSliderCardEmpty />
  );

PersonSliderCard.propTypes = componentPropertyTypes;
PersonSliderCard.defaultProps = defaultProps;

export default PersonSliderCard;
