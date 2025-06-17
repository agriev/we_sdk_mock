import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';

import './more-game-options-collections.styl';

import filter from 'lodash/filter';
import get from 'lodash/get';

import assoc from 'ramda/src/assoc';

import len from 'tools/array/len';

import GameMenuCollections from 'app/components/game-menu-collections';

import { loadGameUserCollections } from 'app/pages/game/game.actions';
import gameType from 'app/pages/game/game.types';
import adjustByProp from 'tools/ramda/adjust-by-property';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

const propTypes = {
  dispatch: PropTypes.func.isRequired,
  game: gameType.isRequired,
  showButton: PropTypes.bool.isRequired,
  openCollectionMenu: PropTypes.func.isRequired,
};

const defaultProps = {
  //
};

const MoreGameOptionsCollections = ({ showButton, game, dispatch, openCollectionMenu }) => {
  const [collections, setCollections] = useState([]);
  const added = filter(collections, { game_in_collection: true });

  const loadCollections = (query) => dispatch(loadGameUserCollections(game.id, game.slug, query));

  useEffect(() => {
    loadCollections().then(setCollections);
  }, []);

  if (showButton) {
    return (
      <div className="more-game-options__bottom-item">
        <div className="more-game-options__button" onClick={openCollectionMenu} role="button" tabIndex="0">
          <SimpleIntlMessage
            id="shared.games_card_collection"
            values={{
              count: len(added),
              name: get(added, '0.name'),
            }}
          />
        </div>
      </div>
    );
  }

  const onCollectionsSearch = useCallback(async (query) => {
    setCollections(await loadCollections(query));
  }, []);

  const onItemClick = useCallback(
    (item) => {
      const updateFlag = assoc('game_in_collection', item.active);
      setCollections(adjustByProp('id', item.id, updateFlag, collections));
    },
    [collections],
  );

  return (
    <GameMenuCollections
      className="more-game-options__collections"
      game={game}
      collections={collections}
      onSearch={onCollectionsSearch}
      onItemClick={onItemClick}
    />
  );
};

MoreGameOptionsCollections.propTypes = propTypes;

MoreGameOptionsCollections.defaultProps = defaultProps;

export default MoreGameOptionsCollections;
