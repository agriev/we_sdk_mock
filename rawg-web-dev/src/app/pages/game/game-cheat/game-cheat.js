/* eslint-disable react/no-danger */

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';
import { injectIntl } from 'react-intl';

import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import checkLocale from 'tools/hocs/check-locale';

import { prepareCheat } from 'app/pages/game/game.prepare';
import gameType from 'app/pages/game/game.types';
import FileCard from 'app/ui/file-card';
import { cheatsTypeItemTitle } from 'app/pages/game/game-cheats/game-cheats.helpers';

import './game-cheat.styl';

import intlShape from 'tools/prop-types/intl-shape';

import GameSubpage from 'app/components/game-subpage';
import paths from 'config/paths';

const hoc = compose(
  hot,
  prepare(prepareCheat, { updateParam: 'id' }),
  checkLocale('ru'),
  injectIntl,
  connect((state) => ({
    game: denormalizeGame(state),
  })),
);

const propTypes = {
  game: gameType.isRequired,
  intl: intlShape.isRequired,
};

const defaultProps = {
  //
};

const GameCheatComponent = ({ game, intl }) => {
  const { cheat } = game;

  if (!game.id || !cheat.id) return null;

  const type = cheat.category.slug;

  return (
    <GameSubpage
      section="cheat"
      heading={() => cheat.seo_h1}
      backPath={paths.gameCheats(game.slug)}
      helmet={{
        title: cheat.seo_title,
        description: cheat.seo_description,
        keywords: cheat.seo_keywords,
      }}
    >
      {cheat.description && (
        <div
          className="game-cheat__content"
          dangerouslySetInnerHTML={{
            __html: cheat.description,
          }}
        />
      )}
      {cheat.url && (
        <div className="game-cheat__content__file">
          <FileCard name={cheatsTypeItemTitle({ type, idx: 0, intl })} attrs={cheat.attrs} url={cheat.url} />
        </div>
      )}
    </GameSubpage>
  );
};

GameCheatComponent.propTypes = propTypes;
GameCheatComponent.defaultProps = defaultProps;

const GameCheat = hoc(GameCheatComponent);

export default GameCheat;
