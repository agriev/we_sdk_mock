import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';
import { injectIntl } from 'react-intl';

import groupBy from 'lodash/groupBy';
import toPairs from 'lodash/toPairs';

import path from 'ramda/src/path';
import cond from 'ramda/src/cond';
import equals from 'ramda/src/equals';
import always from 'ramda/src/always';
import T from 'ramda/src/T';

import paths from 'config/paths';
import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import checkLocale from 'tools/hocs/check-locale';
import getPagesCount from 'tools/get-pages-count';

import { prepareCheats } from 'app/pages/game/game.prepare';
import { PAGE_SIZE, loadGameCheats } from 'app/pages/game/game.actions';

import gameType from 'app/pages/game/game.types';
import { appLocaleType } from 'app/pages/app/app.types';
import intlShape from 'tools/prop-types/intl-shape';

import './game-cheats.styl';

import GameSubpage from 'app/components/game-subpage';
import ListLoader from 'app/ui/list-loader';
import FileCard from 'app/ui/file-card';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import Heading from 'app/ui/heading';
import SeoTexts from 'app/ui/seo-texts';
import { cheatsTypeItemTitle } from 'app/pages/game/game-cheats/game-cheats.helpers';

const cheatsTypeHeading = cond([
  [equals('code'), always('game.cheats_code_heading')],
  [equals('easter'), always('game.cheats_easter_heading')],
  [equals('hints'), always('game.cheats_hints_heading')],
  [equals('save'), always('game.cheats_save_heading')],
  [equals('msc'), always('game.cheats_msc_heading')],
  [equals('faq'), always('game.cheats_faq_heading')],
  [equals('sol'), always('game.cheats_sol_heading')],
  [equals('sol_pak'), always('game.cheats_sol_heading')],
  [T, always('game.cheats_msc_heading')],
]);

const hoc = compose(
  hot,
  prepare(prepareCheats, { updateParam: 'id' }),
  checkLocale('ru'),
  connect((state) => ({
    game: denormalizeGame(state),
    locale: state.app.locale,
  })),
  injectIntl,
);

const propTypes = {
  dispatch: PropTypes.func.isRequired,
  game: gameType.isRequired,
  intl: intlShape.isRequired,
  locale: appLocaleType.isRequired,
};

const defaultProps = {
  //
};

const GameCheatsComponent = ({ dispatch, game, intl, locale }) => {
  const { slug, cheats } = game;
  const { results, loading, next, count } = cheats;

  const load = useCallback(() => dispatch(loadGameCheats(slug, next)), [slug, next]);

  if (!game.id) return null;

  const groups = toPairs(groupBy(results, path(['category', 'slug'])));

  console.log({ groups });

  return (
    <GameSubpage section="cheats">
      <SeoTexts
        locale={locale}
        onLocales="ru"
        values={{ name: game.name }}
        strs={['game.cheats_seo_li_1', 'game.cheats_seo_li_2']}
      />
      <ListLoader
        load={load}
        count={count}
        next={next}
        loading={loading}
        pages={getPagesCount(count, PAGE_SIZE)}
        isOnScroll
      >
        {groups.map(([type, items]) => (
          <div key={type} className="game-subpage__cheats-type">
            <Heading rank={3} className="game-subpage__cheats-type__title">
              <SimpleIntlMessage id={cheatsTypeHeading(type)} />
            </Heading>
            <div className="game-subpage__cheats-type__items">
              {items.map(({ id, attributes, url, description }, idx) => (
                <FileCard
                  key={id}
                  name={cheatsTypeItemTitle({ type, idx, intl })}
                  titleUrl={paths.gameCheat(slug, id)}
                  description={url ? description : undefined}
                  attrs={attributes}
                />
              ))}
            </div>
          </div>
        ))}
      </ListLoader>
    </GameSubpage>
  );
};

GameCheatsComponent.propTypes = propTypes;
GameCheatsComponent.defaultProps = defaultProps;

const GameCheats = hoc(GameCheatsComponent);

export default GameCheats;
