/* eslint-disable react/no-danger */

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';

import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import checkLocale from 'tools/hocs/check-locale';

import { preparePatch } from 'app/pages/game/game.prepare';
import gameType from 'app/pages/game/game.types';
import FileCard from 'app/ui/file-card';

import './game-patch.styl';

import paths from 'config/paths';
import trans from 'tools/trans';

import GameSubpage from 'app/components/game-subpage';

const processDescription = (string) =>
  string
    .replace(/FFF/g, '[f]')
    .replace(/NNN/g, '[+]')
    .replace(/CCC/g, '[!]');

const hoc = compose(
  hot,
  prepare(preparePatch, { updateParam: 'id' }),
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

const GamePatchComponent = ({ game }) => {
  const { patch } = game;

  if (!game.id || !patch.id) return null;

  return (
    <GameSubpage
      section="patch"
      helmet={{
        title: patch.seo_title,
        description: patch.seo_description,
        keywords: patch.seo_keywords,
      }}
      heading={() => patch.seo_h1}
      backPath={paths.gamePatches(game.slug)}
    >
      {patch.description && (
        <div
          className="game-patch__content"
          dangerouslySetInnerHTML={{
            __html: processDescription(patch.description),
          }}
        />
      )}
      {patch.url && (
        <div className="game-patch__content__file">
          <FileCard name={trans('game.patch_item_title')} attrs={patch.attrs} url={patch.url} />
        </div>
      )}
    </GameSubpage>
  );
};

GamePatchComponent.propTypes = propTypes;
GamePatchComponent.defaultProps = defaultProps;

const GamePatch = hoc(GamePatchComponent);

export default GamePatch;
