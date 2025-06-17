import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import denormalizeGame from 'tools/redux/denormalize-game';
import prepare from 'tools/hocs/prepare';
import getPagesCount from 'tools/get-pages-count';

import { prepareCollections } from 'app/pages/game/game.prepare';

import ListLoader from 'app/ui/list-loader';
import CollectionCard from 'app/ui/collection-card-new';
import { appSizeType } from 'app/pages/app/app.types';
import { loadGameCollections, PAGE_SIZE } from 'app/pages/game/game.actions';
import GameSubpage from 'app/components/game-subpage';
import gameType from 'app/pages/game/game.types';

@prepare(prepareCollections, { updateParam: 'id' })
@connect((state) => ({
  size: state.app.size,
  game: denormalizeGame(state),
}))
export default class GameCollections extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    game: gameType.isRequired,
    size: appSizeType.isRequired,
  };

  load = () => {
    const { dispatch, game } = this.props;
    const {
      slug,
      collections: { next },
    } = game;

    return dispatch(loadGameCollections(slug, next));
  };

  render() {
    const { game, size } = this.props;
    if (!game.id) return null;

    const { collections } = game;
    const { results, loading, next, count } = collections;

    return (
      <GameSubpage section="collections">
        <ListLoader
          load={this.load}
          count={count}
          next={next}
          loading={loading}
          pages={getPagesCount(count, PAGE_SIZE)}
          isOnScroll
        >
          <div className="game-subpage__list">
            {results.map((collection) => (
              <CollectionCard collection={collection} kind="inline" key={collection.id} size={size} />
            ))}
          </div>
        </ListLoader>
      </GameSubpage>
    );
  }
}
