import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';

import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import getPagesCount from 'tools/get-pages-count';
import { prepareDemos } from 'app/pages/game/game.prepare';

import './game-demos.styl';

import { appLocaleType } from 'app/pages/app/app.types';

import ListLoader from 'app/ui/list-loader';
import { PAGE_SIZE, loadGameDemos } from 'app/pages/game/game.actions';
import GameSubpage from 'app/components/game-subpage';
import gameType from 'app/pages/game/game.types';
import FileCard from 'app/ui/file-card';
import checkLocale from 'tools/hocs/check-locale';
import paths from 'config/paths';
import SeoTexts from 'app/ui/seo-texts';

const hoc = compose(
  hot,
  prepare(prepareDemos, { updateParam: 'id' }),
  checkLocale('ru'),
  connect((state) => ({
    game: denormalizeGame(state),
    locale: state.app.locale,
  })),
);

const propTypes = {
  dispatch: PropTypes.func.isRequired,
  locale: appLocaleType.isRequired,
  game: gameType.isRequired,
};

const defaultProps = {
  //
};

const GameDemosComponent = ({ dispatch, game, locale }) => {
  const { slug, demos } = game;
  const { results, loading, next, count } = demos;

  const load = useCallback(() => dispatch(loadGameDemos(slug, next)), [slug, next]);

  if (!game.id) return null;

  return (
    <GameSubpage section="demos">
      <SeoTexts
        locale={locale}
        onLocales="ru"
        values={{ name: game.name }}
        strs={['game.demos_seo_li_1', 'game.demos_seo_li_2']}
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
              titleUrl={paths.gameDemo(slug, id)}
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

GameDemosComponent.propTypes = propTypes;
GameDemosComponent.defaultProps = defaultProps;

const GameDemos = hoc(GameDemosComponent);

export default GameDemos;
