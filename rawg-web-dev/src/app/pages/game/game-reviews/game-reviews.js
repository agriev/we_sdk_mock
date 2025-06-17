import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';

import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import { prepareReviews } from 'app/pages/game/game.prepare';

import { appRatingsType, appSizeType, appLocaleType } from 'app/pages/app/app.types';
import GameSubpage from 'app/components/game-subpage';
import GameReviewsBlock from 'app/pages/game/game/reviews';

import gameType from 'app/pages/game/game.types';
import intlShape from 'tools/prop-types/intl-shape';

import SeoTexts from 'app/ui/seo-texts';

@prepare(prepareReviews, { updateParam: 'id' })
@injectIntl
@connect((state) => ({
  game: denormalizeGame(state),
  allRatings: state.app.ratings,
  appSize: state.app.size,
  locale: state.app.locale,
}))
export default class GameReviews extends React.Component {
  static propTypes = {
    appSize: appSizeType.isRequired,
    locale: appLocaleType.isRequired,
    game: gameType.isRequired,
    allRatings: appRatingsType.isRequired,
    dispatch: PropTypes.func.isRequired,
    intl: intlShape.isRequired,
  };

  static defaultProps = {
    //
  };

  render() {
    const { allRatings, game, dispatch, intl, appSize, locale } = this.props;
    const { reviews } = game;

    if (!game.id) return null;

    return (
      <GameSubpage section="reviews">
        <SeoTexts
          locale={locale}
          onLocales="ru"
          values={{ name: game.name }}
          strs={['game.reviews_seo_li_1', 'game.reviews_seo_li_2']}
        />
        <GameReviewsBlock
          appSize={appSize}
          dispatch={dispatch}
          intl={intl}
          game={game}
          reviews={reviews}
          ratings={allRatings}
        />
      </GameSubpage>
    );
  }
}
