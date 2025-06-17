import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';

import paths from 'config/paths';
import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import getPagesCount from 'tools/get-pages-count';
import { preparePatches } from 'app/pages/game/game.prepare';

import './game-patches.styl';

import ListLoader from 'app/ui/list-loader';
import { PAGE_SIZE, loadGamePatches } from 'app/pages/game/game.actions';
import GameSubpage from 'app/components/game-subpage';
import gameType from 'app/pages/game/game.types';
import FileCard from 'app/ui/file-card';
import checkLocale from 'tools/hocs/check-locale';
import SeoTexts from 'app/ui/seo-texts/seo-texts';
import { appLocaleType } from 'app/pages/app/app.types';

const hoc = compose(
  hot,
  prepare(preparePatches, { updateParam: 'id' }),
  checkLocale('ru'),
  connect((state) => ({
    game: denormalizeGame(state),
    locale: state.app.locale,
  })),
);

const propTypes = {
  dispatch: PropTypes.func.isRequired,
  game: gameType.isRequired,
  locale: appLocaleType.isRequired,
};

const defaultProps = {
  //
};

const GamePatchesComponent = ({ dispatch, game, locale }) => {
  const { slug, patches } = game;
  const { results, loading, next, count } = patches;

  const load = useCallback(() => dispatch(loadGamePatches(slug, next)), [slug, next]);

  if (!game.id) return null;

  return (
    <GameSubpage section="patches">
      <SeoTexts
        locale={locale}
        onLocales="ru"
        values={{ name: game.name }}
        strs={['game.patches_seo_li_1', 'game.patches_seo_li_2']}
      />
      <ListLoader
        load={load}
        count={count}
        next={next}
        loading={loading}
        pages={getPagesCount(count, PAGE_SIZE)}
        isOnScroll
      >
        <div className="game-subpage__list game-subpage__list_blocks">
          {results.map(({ id, name, description, attributes }) => (
            <FileCard
              key={id}
              titleUrl={paths.gamePatch(slug, id)}
              name={name}
              attrs={attributes}
              description={description}
            />
          ))}
        </div>
      </ListLoader>
    </GameSubpage>
  );
};

GamePatchesComponent.propTypes = propTypes;
GamePatchesComponent.defaultProps = defaultProps;

const GamePatches = hoc(GamePatchesComponent);

export default GamePatches;
