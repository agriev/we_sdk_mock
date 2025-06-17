import React from 'react';
import PropTypes from 'prop-types';
import { pure } from 'recompose';
import { injectIntl } from 'react-intl';
import { Element } from 'react-scroll';

import paths from 'config/paths';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import SectionHeading from 'app/ui/section-heading';
import PersonsSlider from 'app/components/persons-slider';
import PersonSemanticData from 'app/ui/person-card/person-semantic-data';

import './game-persons.styl';

import { persons as personsType } from 'app/pages/game/game.types';
import { appLocaleType } from 'app/pages/app/app.types';

const componentPropertyTypes = {
  className: PropTypes.string,
  persons: personsType,
  size: PropTypes.string.isRequired,
  creators_count: PropTypes.number,
  slug: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  appLocale: appLocaleType.isRequired,
};

const defaultProps = {
  persons: {
    count: 0,
    results: [],
  },
  creators_count: 0,
  className: '',
};

const GamePersons = ({ className, persons, size, creators_count: creatorsCount, slug, name, appLocale }) => {
  if (creatorsCount < 1) return null;

  const path = paths.gameTeam(slug);

  const personStubs = () => new Array(3 - persons.results.length).fill({});
  let personsResults = persons.count > 2 ? persons.results : [...persons.results, ...personStubs()];
  const needMoreButton = personsResults.length > 5;
  personsResults = personsResults.length > 5 ? personsResults.slice(0, 5) : personsResults;

  return (
    <div className={['game-persons', className].join(' ')}>
      <Element name="persons" />
      {persons.results.map((person) => (
        <PersonSemanticData key={person.id} person={person} appLocale={appLocale} semantic="gamepage" />
      ))}
      <SectionHeading
        url={path}
        heading={<SimpleIntlMessage id="game.team_title" values={{ name }} />}
        count={<SimpleIntlMessage id="game.team_count" values={{ count: creatorsCount }} />}
      />
      <PersonsSlider persons={personsResults} size={size} needMoreButton={needMoreButton} path={path} />
    </div>
  );
};

GamePersons.propTypes = componentPropertyTypes;
GamePersons.defaultProps = defaultProps;

const injectedIntlGamePersons = injectIntl(GamePersons);

export default pure(injectedIntlGamePersons);
