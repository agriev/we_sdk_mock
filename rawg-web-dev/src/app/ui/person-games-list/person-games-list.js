/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import SVGInline from 'react-svg-inline';
import { injectIntl } from 'react-intl';

import paths from 'config/paths';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import GameCardCompact from 'app/components/game-card-compact';

import arrowDown from 'assets/icons/arrow-down.svg';

import currentUserType from 'app/components/current-user/current-user.types';

import './person-games-list.styl';

const showMoreEnabled = false;

const componentPropertyTypes = {
  className: PropTypes.string,
  loadNextGames: PropTypes.func.isRequired,
  person: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string.isRequired,
    slug: PropTypes.string.isRequired,
    games: PropTypes.arrayOf(PropTypes.shape({})),
    postions: PropTypes.arrayOf(PropTypes.shape({})),
    positions: PropTypes.array,
    games_count: PropTypes.number,
  }).isRequired,
  dispatch: PropTypes.func.isRequired,
  currentUser: currentUserType.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const defaultProps = {
  className: '',
};

const PersonGamesList = ({
  className,
  loadNextGames,
  person: { name, slug, games, positions, games_count },
  person,
  dispatch,
  currentUser,
  allRatings,
}) => {
  const gamesCounter = games_count - 1;

  return (
    <div className={['person-games-list', className].join(' ')}>
      <div className="person-game-list__profession">
        {Array.isArray(positions) &&
          positions.map((position) => position.name[0].toUpperCase() + position.name.slice(1)).join(', ')}
      </div>
      <div className="person-game-list__games-container">
        <Link className="person-game-list__name" to={paths.creator(slug)}>
          {name}
        </Link>
        <p className="person-game-list__game-counter">
          {games.length !== 0 && <SimpleIntlMessage id="game.team_counter" values={{ gamesCounter }} />}
        </p>
        <div className="person-game-list__games">
          <div className="game-card_inline-container">
            {games.map((game) => (
              <GameCardCompact
                key={game.id}
                game={game}
                dispatch={dispatch}
                currentUser={currentUser}
                allRatings={allRatings}
              />
            ))}
          </div>
          {showMoreEnabled && games_count > 4 && games.length < games_count - 1 && (
            <div className="person-games-list__button-wrap">
              <div
                className="person-games-list__button"
                onClick={() => loadNextGames(person.id)}
                role="button"
                tabIndex={0}
              >
                <SimpleIntlMessage id="game.team_load" />
                <SVGInline className="person-games-list__button-icon" svg={arrowDown} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

PersonGamesList.propTypes = componentPropertyTypes;

PersonGamesList.defaultProps = defaultProps;

const injectedIntlPersonGamesList = injectIntl(PersonGamesList);

export default injectedIntlPersonGamesList;
