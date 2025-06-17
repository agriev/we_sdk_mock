import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import getPagesCount from 'tools/get-pages-count';
import { prepareReddit } from 'app/pages/game/game.prepare';

import redditLogo from 'assets/icons/reddit-logo.png';

import gameType from 'app/pages/game/game.types';

import ListLoader from 'app/ui/list-loader';
import RedditCard from 'app/ui/reddit-card';
import { loadGameReddit, PAGE_SIZE } from 'app/pages/game/game.actions';
import GameSubpage from 'app/components/game-subpage';
import './game-reddit.styl';

@prepare(prepareReddit, { updateParam: 'id' })
@connect((state) => ({
  game: denormalizeGame(state),
}))
export default class GameReddit extends Component {
  static propTypes = {
    game: gameType.isRequired,
    dispatch: PropTypes.func.isRequired,
  };

  load = () => {
    const { dispatch, game } = this.props;
    const {
      slug,
      reddit: { next },
    } = game;

    return dispatch(loadGameReddit(slug, next));
  };

  render() {
    const { game } = this.props;
    if (!game.id) return null;

    const { reddit } = game;
    const { results, loading, next, count } = reddit;

    return (
      <GameSubpage section="reddit" logo={<img className="game-subpage__reddit-icon" src={redditLogo} alt="" />}>
        <ListLoader
          load={this.load}
          count={count}
          next={next}
          loading={loading}
          pages={getPagesCount(count, PAGE_SIZE)}
          isOnScroll
        >
          <div className="game-subpage__list">
            {results.map((post) => (
              <RedditCard className="game-subpage__reddit-item" post={post} key={post.id} />
            ))}
          </div>
        </ListLoader>
      </GameSubpage>
    );
  }
}
