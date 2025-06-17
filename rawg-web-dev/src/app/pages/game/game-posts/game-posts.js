import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';

import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import { preparePosts } from 'app/pages/game/game.prepare';

import gameType from 'app/pages/game/game.types';
import intlShape from 'tools/prop-types/intl-shape';

import GameSubpage from 'app/components/game-subpage';
import GamePostsBlock from 'app/pages/game/game/posts';

@prepare(preparePosts, { updateParam: 'id' })
@injectIntl
@connect((state) => ({
  game: denormalizeGame(state),
}))
export default class GamePosts extends Component {
  static propTypes = {
    game: gameType.isRequired,
    dispatch: PropTypes.func.isRequired,
    intl: intlShape.isRequired,
  };

  render() {
    const { game, dispatch, intl } = this.props;
    if (!game.id) return null;

    const { id, name, slug, posts } = game;

    return (
      <GameSubpage section="posts">
        <GamePostsBlock
          dispatch={dispatch}
          intl={intl}
          id={id}
          name={name}
          slug={slug}
          posts={posts}
          postCardProps={{
            expanded: true,
          }}
        />
      </GameSubpage>
    );
  }
}
