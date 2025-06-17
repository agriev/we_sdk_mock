import React from 'react';
// import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { compose } from 'recompose';
import { FormattedMessage } from 'react-intl';
import SVGInline from 'react-svg-inline';
import cn from 'classnames';
import { Link } from 'app/components/link';

import resize from 'tools/img/resize';

import checkIcon from 'assets/icons/check.svg';
import Platforms from 'app/ui/platforms';
import RoundProgressbar from 'app/ui/round-progressbar';
import Time from 'app/ui/time';
import appHelper from 'app/pages/app/app.helper';
import { appSizeType } from 'app/pages/app/app.types';
import paths from 'config/paths';

import { recommendedGameType } from 'app/pages/tokens/tokens.data.types';

import './game.styl';

const hoc = compose(hot(module));

const componentPropertyTypes = {
  game: recommendedGameType.isRequired,
  size: appSizeType.isRequired,
};

const RecommendedGame = ({ game, size }) => {
  const coverStyle = {
    backgroundImage: game.background_image
      ? `
    linear-gradient(to bottom, rgba(32,32,32,0.6), rgb(32,32,32) 70%),
    url('${resize(640, game.background_image)}')
  `
      : `
    linear-gradient(to bottom, rgba(32,32,32,0.8), rgb(32,32,32) 70%)
  `,
  };

  return (
    <div className="tokens__recommended__game" style={coverStyle}>
      <div className="tokens__recommended__game__head">
        <Link
          to={{ pathname: paths.game(game.slug), state: game }}
          href={paths.game(game.slug)}
          className="tokens__recommended__game__title"
        >
          {game.name}
          {Array.isArray(game.platforms) && game.platforms.length > 0 && (
            <Platforms platforms={game.platforms} parentPlatforms={game.parent_platforms} size="medium" icons parents />
          )}
        </Link>
        <div className="tokens__recommended__game__icons">
          <div className="tokens__recommended__game__icon-achievements">
            <FormattedMessage
              id="tokens.recommended_stats_achievements"
              values={{ count: game.parent_achievements_count }}
            />
          </div>
          <div className="tokens__recommended__game__icon-percent">
            <RoundProgressbar percent={game.percent} squareSize={21} strokeWidth={3} />
            {game.percent}
          </div>
        </div>
      </div>
      <div className="tokens__recommended__game__achievements">
        <div className="tokens__recommended__game__achievements-head">
          <div className="tokens__recommended__game__achievements-head__item">
            <FormattedMessage id="tokens.earned_achievements_achievement_and_date" />
          </div>
          <div className="tokens__recommended__game__achievements-head__item">
            <FormattedMessage id="tokens.earned_achievements_reward" />
          </div>
        </div>
        {game.achievements.map((achievement) => (
          <div key={achievement.id} className="tokens__recommended__game__achievement">
            <div
              className="tokens__recommended__game__achievement__image"
              style={{ backgroundImage: `url(${achievement.image})` }}
            />
            <div className="tokens__recommended__game__achievement__info">
              <div className="tokens__recommended__game__achievement__info__name">
                {achievement.name}
                {achievement.achieved && [
                  <SVGInline key="icon" svg={checkIcon} width="12px" height="9px" />,
                  appHelper.isDesktopSize({ size }) && (
                    <span key="date" className="tokens__recommended__game__achievement__info__date">
                      <Time date={achievement.achieved} relative />
                    </span>
                  ),
                ]}
              </div>
              <div className="tokens__recommended__game__achievement__info__desc">
                {achievement.description}
                {achievement.achieved && appHelper.isPhoneSize({ size }) && (
                  <div className="tokens__recommended__game__achievement__info__desc-date">
                    <Time date={achievement.achieved} relative />
                  </div>
                )}
              </div>
            </div>
            <div
              className={cn(
                'tokens__recommended__game__achievement__reward',
                `tokens__recommended__game__achievement__reward_${achievement.type}`,
              )}
            >
              <span>{achievement.karma}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

RecommendedGame.propTypes = componentPropertyTypes;

export default hoc(RecommendedGame);
