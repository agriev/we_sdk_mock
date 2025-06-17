/* eslint-disable react/no-danger */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';
import cn from 'classnames';

import get from 'lodash/get';

import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import checkLocale from 'tools/hocs/check-locale';

import { prepareReview } from 'app/pages/game/game.prepare';
import gameType from 'app/pages/game/game.types';

import './game-review.styl';

import GameSubpage from 'app/components/game-subpage';
import paths from 'config/paths';
import { appSizeType, appThemeType } from 'app/pages/app/app.types';
import appHelper from 'app/pages/app/app.helper';

import ThemeSwitcher from 'app/components/theme-switcher';
import { themeClass } from 'app/components/theme-switcher/theme-switcher.helper';

import GameReviewContent from './components/content';
import GameReviewFooter from './components/footer';
import GameUsersReviews from './components/users-reviews';

const hoc = compose(
  hot,
  prepare(prepareReview, { updateParam: 'id' }),
  checkLocale('ru'),
  connect((state) => ({
    game: denormalizeGame(state),
    appSize: state.app.size,
    appTheme: state.app.settings.theme,
  })),
);

const propTypes = {
  game: gameType.isRequired,
  appSize: appSizeType.isRequired,
  appTheme: appThemeType.isRequired,
  dispatch: PropTypes.func.isRequired,
};

const defaultProps = {
  //
};

const GameReviewComponent = ({ game, appSize, dispatch, appTheme }) => {
  const { review } = game;
  const isDesktop = appHelper.isDesktopSize(appSize);

  if (!game.id || !review || !review.id) return null;

  const separator = <div className="game_review__separator" />;

  return (
    <GameSubpage
      section="review"
      title="game.subpage_title_review"
      heading="game.review_heading"
      backPath={paths.game(game.slug)}
      className={cn('review_page', themeClass(appTheme))}
      gameHeadMetaProperties={{
        onRight: <ThemeSwitcher dispatch={dispatch} theme={appTheme} />,
      }}
    >
      <GameReviewContent isDesktop={isDesktop} game={game} />
      <GameReviewFooter review={review} />
      {get(game, 'reviews.count') > 0 && (
        <>
          {separator}
          <GameUsersReviews appSize={appSize} dispatch={dispatch} game={game} />
        </>
      )}
    </GameSubpage>
  );
};

GameReviewComponent.propTypes = propTypes;
GameReviewComponent.defaultProps = defaultProps;

const GameReview = hoc(GameReviewComponent);

export default GameReview;
