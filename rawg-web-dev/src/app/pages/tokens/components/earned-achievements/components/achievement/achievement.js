import React from 'react';
import PropTypes from 'prop-types';
import { compose, withHandlers } from 'recompose';
import { hot } from 'react-hot-loader';
import { Link } from 'app/components/link';
import SVGInline from 'react-svg-inline';
import cn from 'classnames';

import checkIcon from 'assets/icons/check-bold.svg';

import './achievement.styl';

import Time from 'app/ui/time/time';
import Tooltip from 'app/ui/rc-tooltip';
import { appSizeType } from 'app/pages/app/app.types';
import appHelper from 'app/pages/app/app.helper';
import { achievementType } from 'app/pages/tokens/tokens.data.types';

import paths from 'config/paths';

const hoc = compose(
  hot(module),
  withHandlers({
    renderContent: ({ achievement }) => () => (
      <div className="tokens__earned-achievements__item__reward-tooltip">Rarity: {achievement.percent}%</div>
    ),
  }),
);

const componentPropertyTypes = {
  achievement: achievementType.isRequired,
  index: PropTypes.number.isRequired,
  allCount: PropTypes.number.isRequired,
  renderContent: PropTypes.func.isRequired,
  size: appSizeType.isRequired,
};

const Achievement = ({ achievement, index, allCount, renderContent, size }) => {
  const rewardBlock = (key) => (
    <div
      className={cn(
        'tokens__earned-achievements__item__reward',
        `tokens__earned-achievements__item__reward_${achievement.type}`,
      )}
      key={key}
    >
      <Tooltip
        trigger={['hover']}
        placement={appHelper.isDesktopSize({ size }) ? 'bottom' : 'left'}
        overlay={renderContent}
      >
        <span>{achievement.karma}</span>
      </Tooltip>
    </div>
  );

  return (
    <div className="tokens__earned-achievements__item">
      <div className="tokens__earned-achievements__item__id">{allCount - index}</div>
      <div
        className="tokens__earned-achievements__item__image"
        style={{ backgroundImage: `url(${achievement.image})` }}
      />
      <div className="tokens__earned-achievements__item__info">
        <div className="tokens__earned-achievements__item__info__name">
          {appHelper.isPhoneSize({ size }) && rewardBlock()}
          {achievement.name}
          <SVGInline svg={checkIcon} width="12px" height="9px" />
        </div>
        <div className="tokens__earned-achievements__item__info__desc">{achievement.description}</div>
        <div
          className={cn('tokens__earned-achievements__item__info__date', {
            'tokens__earned-achievements__item__info__date-new': achievement.is_new,
          })}
        >
          {appHelper.isPhoneSize({ size }) && (
            <span className="tokens__earned-achievements__item__info__date__game">
              <Link to={paths.game(achievement.game.slug)} href={paths.game(achievement.game.slug)}>
                {achievement.game.name}
              </Link>
            </span>
          )}
          <span className="tokens__earned-achievements__item__info__date__time">
            <Time date={achievement.achieved} relative />
          </span>
        </div>
      </div>
      {appHelper.isDesktopSize({ size }) && [
        <div key="game-name" className="tokens__earned-achievements__item__game">
          <Link to={paths.game(achievement.game.slug)} href={paths.game(achievement.game.slug)}>
            {achievement.game.name}
          </Link>
        </div>,
        rewardBlock('reward'),
      ]}
    </div>
  );
};

Achievement.propTypes = componentPropertyTypes;

export default hoc(Achievement);
