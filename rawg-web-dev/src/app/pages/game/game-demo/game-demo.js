/* eslint-disable react/no-danger */

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';

import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import checkLocale from 'tools/hocs/check-locale';

import { prepareDemo } from 'app/pages/game/game.prepare';
import gameType from 'app/pages/game/game.types';
import FileCard from 'app/ui/file-card';

import './game-demo.styl';

import paths from 'config/paths';
import trans from 'tools/trans';

import GameSubpage from 'app/components/game-subpage';

const hoc = compose(
  hot,
  prepare(prepareDemo, { updateParam: 'id' }),
  checkLocale('ru'),
  connect((state) => ({
    game: denormalizeGame(state),
  })),
);

const propTypes = {
  game: gameType.isRequired,
};

const defaultProps = {
  //
};

const GameDemoComponent = ({ game }) => {
  const { demo } = game;

  if (!game.id || !demo.id) return null;

  return (
    <GameSubpage
      section="demo"
      heading={() => demo.seo_h1}
      backPath={paths.gameDemos(game.slug)}
      helmet={{
        title: demo.seo_title,
        description: demo.seo_description,
        keywords: demo.seo_keywords,
      }}
    >
      {demo.description && (
        <div
          className="game-demo__content"
          dangerouslySetInnerHTML={{
            __html: demo.description,
          }}
        />
      )}
      {demo.url && (
        <div className="game-demo__content__file">
          <FileCard name={trans('game.demo_item_title')} attrs={demo.attrs} url={demo.url} />
        </div>
      )}
    </GameSubpage>
  );
};

GameDemoComponent.propTypes = propTypes;
GameDemoComponent.defaultProps = defaultProps;

const GameDemo = hoc(GameDemoComponent);

export default GameDemo;
