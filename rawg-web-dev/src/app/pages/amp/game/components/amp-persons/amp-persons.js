import React from 'react';
import PropTypes from 'prop-types';
import { pure } from 'recompose';
import { injectIntl, FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';
import SVGInline from 'react-svg-inline';

import arrowRight from 'assets/icons/arrow-right.svg';

import PersonSemanticData from 'app/ui/person-card/person-semantic-data';
import AmpPersonsSlider from 'app/pages/amp/shared/amp-persons-slider';

import { persons as personsType } from 'app/pages/game/game.types';

const componentPropertyTypes = {
  className: PropTypes.string,
  persons: personsType,
  path: PropTypes.string.isRequired,
};

const defaultProps = {
  persons: {
    count: 0,
    results: [],
  },
  className: '',
};

const GamePersons = (props) => {
  const { className, persons, path } = props;

  if (!persons.count) return null;

  const personStubs = () => new Array(3 - persons.results.length).fill({});
  const personsResults = persons.count > 2 ? persons.results : [...persons.results, ...personStubs()];

  return (
    <div className={['game-persons', className].join(' ')}>
      {persons.results.map((person) => (
        <PersonSemanticData key={person.id} person={person} semantic="gamepage" />
      ))}

      <h3 className="game-persons__title">
        <FormattedMessage id="game.team_title" />
        <span className="game-persons__games-counter">{persons.count}</span>
      </h3>
      <AmpPersonsSlider persons={personsResults} />
      {persons.count > 3 && (
        <div className="game-persons__view-all-wrap">
          <Link className="game-persons__view-all-link" to={path} href={path}>
            View all
            <SVGInline className="game__view-all-icon" svg={arrowRight} />
          </Link>
        </div>
      )}
    </div>
  );
};

GamePersons.propTypes = componentPropertyTypes;
GamePersons.defaultProps = defaultProps;

const injectedIntlGamePersons = injectIntl(GamePersons);

export default pure(injectedIntlGamePersons);
