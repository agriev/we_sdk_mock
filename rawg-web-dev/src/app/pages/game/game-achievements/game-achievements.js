import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import denormalizeGame from 'tools/redux/denormalize-game';
import prepare from 'tools/hocs/prepare';
import getPagesCount from 'tools/get-pages-count';

import { prepareAchievements } from 'app/pages/game/game.prepare';

import gameType from 'app/pages/game/game.types';

import ListLoader from 'app/ui/list-loader';
import AchievementCard from 'app/ui/achievement-card';
import { loadGameAchievements, PAGE_SIZE } from 'app/pages/game/game.actions';
import GameSubpage from 'app/components/game-subpage';

@prepare(prepareAchievements, { updateParam: 'id' })
@connect((state) => ({
  game: denormalizeGame(state),
}))
export default class GameAchievements extends Component {
  static propTypes = {
    game: gameType.isRequired,
    dispatch: PropTypes.func.isRequired,
  };

  load = () => {
    const { dispatch, game } = this.props;
    const {
      slug,
      achievements: { next },
    } = game;

    return dispatch(loadGameAchievements(slug, next));
  };

  render() {
    const { game } = this.props;
    if (!game.id) return null;

    const { achievements } = game;
    const { results, loading, next, count } = achievements;

    return (
      <GameSubpage section="achievements">
        <ListLoader
          load={this.load}
          count={count}
          next={next}
          loading={loading}
          pages={getPagesCount(count, PAGE_SIZE)}
          isOnScroll
        >
          <div className="game-subpage__list">
            {results.map((achievement) => (
              <AchievementCard achievement={achievement} key={achievement.id} />
            ))}
          </div>
        </ListLoader>
      </GameSubpage>
    );
  }
}
