import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { denormalize } from 'normalizr';

import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import getPagesCount from 'tools/get-pages-count';
import Schemas from 'redux-logic/schemas';
import { prepareTeam } from 'app/pages/game/game.prepare';
import { loadGameCreators, loadGamePersonGames, PAGE_SIZE } from 'app/pages/game/game.actions';

import currentUserType from 'app/components/current-user/current-user.types';
import gameType from 'app/pages/game/game.types';
import { appLocaleType } from 'app/pages/app/app.types';

import ListLoader from 'app/ui/list-loader';
import PersonGamesList from 'app/ui/person-games-list';
import GameSubpage from 'app/components/game-subpage';
import SeoTexts from 'app/ui/seo-texts';

import './game-team.styl';

@prepare(prepareTeam, { updateParam: 'id' })
@connect((state) => ({
  game: denormalizeGame(state),
  personsItems: denormalize(state.game.persons.results, Schemas.PERSON_ARRAY, state.entities),
  currentUser: state.currentUser,
  allRatings: state.app.ratings,
  locale: state.app.locale,
}))
export default class GameTeam extends Component {
  static propTypes = {
    game: gameType.isRequired,
    personsItems: PropTypes.arrayOf(PropTypes.shape()).isRequired,
    allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
    dispatch: PropTypes.func.isRequired,
    currentUser: currentUserType.isRequired,
    locale: appLocaleType.isRequired,
  };

  loadNextGames = (personId) => {
    const { game, dispatch } = this.props;
    const { slug } = game;

    dispatch(loadGamePersonGames(personId, slug));
  };

  load = () => {
    const {
      game: { persons, slug },
      dispatch,
    } = this.props;

    return dispatch(loadGameCreators(slug, persons.next, PAGE_SIZE));
  };

  render() {
    const { game, personsItems, dispatch, currentUser, allRatings, locale } = this.props;

    if (!game.id) return null;

    const { persons } = game;
    const { count, next, loading } = persons;

    return (
      <GameSubpage section="team">
        <SeoTexts
          locale={locale}
          onLocales="ru"
          values={{ name: game.name }}
          strs={['game.team_seo_li_1', 'game.team_seo_li_2']}
        />
        <ListLoader
          load={this.load}
          count={count}
          next={next}
          loading={loading}
          pages={getPagesCount(count, PAGE_SIZE)}
          isOnScroll
        >
          <div className="game-team">
            {personsItems.map((person) => (
              <PersonGamesList
                person={person}
                key={person.id}
                loadNextGames={this.loadNextGames}
                currentGame={game.slug}
                dispatch={dispatch}
                currentUser={currentUser}
                allRatings={allRatings}
              />
            ))}
          </div>
        </ListLoader>
      </GameSubpage>
    );
  }
}
