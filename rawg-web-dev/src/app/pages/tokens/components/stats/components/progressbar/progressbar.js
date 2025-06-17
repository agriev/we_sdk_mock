/* eslint-disable no-mixed-operators */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader';
import maxBy from 'lodash/maxBy';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';
import min from 'lodash/min';
import get from 'lodash/get';
import cookies from 'browser-cookies';
import debounce from 'lodash/debounce';

import env from 'config/env';
import formatNumber from 'tools/format-number';

import Avatar from 'app/ui/avatar/avatar';
import Time from 'app/ui/time/time';
import checkIcon from 'assets/icons/raptr-check.svg';

import tokensDashboardTypes, { STATUS_ACTIVE } from 'app/pages/tokens/tokens.types';
import { lastAchievementType } from 'app/pages/tokens/tokens.data.types';

import './progressbar.styl';

const calcGoalPosition = (goal, max) => ({
  left: `${min([(goal / max) * 100, 99])}%`,
});

const cookieName = 'tokens.lastAchievementViewed';

@hot(module)
class ProgressBar extends React.Component {
  static propTypes = {
    tokensDashboard: tokensDashboardTypes.isRequired,
    lastAchievement: lastAchievementType.isRequired,
    requestCookies: PropTypes.shape(),
  };

  static defaultProps = {
    requestCookies: null,
  };

  stageTextRefs = [];

  constructor(...arguments_) {
    super(...arguments_);

    this.state = {
      popupOpened: this.getInitialPopupState(),
    };
  }

  componentDidMount() {
    this.checkStageTextPositions();

    window.addEventListener('resize', this.onResize);
  }

  componentDidUpdate() {
    this.checkStageTextPositions();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onResize);
  }

  onClosePopup = () => {
    cookies.set(cookieName, 'true', { expires: 0 });
    this.setState({ popupOpened: false });
  };

  onMouseEnter = () => {
    const { popupOpened } = this.state;

    if (!popupOpened && cookies.get(cookieName) === 'true') {
      this.setState({ popupOpened: true });
    }
  };

  onMouseLeave = () => {
    const { popupOpened } = this.state;

    if (popupOpened && cookies.get(cookieName) === 'true') {
      this.setState({ popupOpened: false });
    }
  };

  onResize = debounce(() => {
    this.checkStageTextPositions();
  }, 200);

  getInitialPopupState = () => {
    const { requestCookies } = this.props;

    if (env.isClient()) {
      return cookies.get(cookieName) !== 'true';
    }

    return requestCookies[cookieName] !== 'true';
  };

  /**
   * Функция необходима для того чтобы проверить, не наезжают ли тексты
   * показателей этапов друг на друга, и если наезжают - она заставит их немного сместиться.
   */
  checkStageTextPositions = () => {
    /* eslint-disable no-param-reassign */

    if (this.stageTextRefs.length === 0) {
      return;
    }

    this.stageTextRefs.forEach((element) => {
      element.style.transform = '';
    });

    this.stageTextRefs.reduce((previous, current) => {
      const previousDims = previous.getBoundingClientRect();
      const currentDims = current.getBoundingClientRect();

      if (previousDims.right >= currentDims.left) {
        current.style.transform = `translateX(${previousDims.right - currentDims.left + 5}px)`;
      }

      return current;
    });
  };

  stageTextRef = (element) => {
    if (element === null) {
      this.stageTextRefs = [];
    } else {
      this.stageTextRefs.push(element);
    }
  };

  render() {
    const { tokensDashboard, lastAchievement, requestCookies } = this.props;

    const { popupOpened } = this.state;

    const { stages, percent } = tokensDashboard;
    const maxAchievements = (maxBy(stages, 'achievements') || {}).achievements || 0;
    const cookieWasSet = env.isClient() ? cookies.get(cookieName) === 'true' : requestCookies[cookieName] === 'true';

    const showPopup = popupOpened && tokensDashboard.status === STATUS_ACTIVE && percent > 10 && percent < 90;

    return (
      <div className="tokens__stats__progress-container">
        <div className="tokens__stats__progress" onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <div className="tokens__stats__progress__line">
            <div className="tokens__stats__progress__line__meter" style={{ width: `${percent}%` }}>
              <div
                className={cn('tokens__stats__progress__line__popup', {
                  tokens__stats__progress__line__popup_opened: showPopup,
                })}
              >
                <div className="tokens__stats__progress__line__popup__head">
                  <div className="tokens__stats__progress__line__popup__head__avatar">
                    <Avatar size={24} src={lastAchievement.user.avatar} profile={lastAchievement.user} />
                  </div>
                  <div className="tokens__stats__progress__line__popup__head__name">
                    {lastAchievement.user.full_name || lastAchievement.user.username}
                  </div>
                  <div className="tokens__stats__progress__line__popup__head__time">
                    <Time date={lastAchievement.achieved} relative={1} />
                  </div>
                  {!cookieWasSet && (
                    <div
                      className="tokens__stats__progress__line__popup__head__close"
                      onClick={this.onClosePopup}
                      role="button"
                      tabIndex={0}
                    />
                  )}
                </div>
                <div className="tokens__stats__progress__line__popup__content">
                  <div
                    className="tokens__stats__progress__line__popup__content__achievement-image"
                    style={{ backgroundImage: `url(${lastAchievement.image})` }}
                  />
                  <div className="tokens__stats__progress__line__popup__content__info">
                    <div className="tokens__stats__progress__line__popup__content__info__name">
                      {lastAchievement.name}
                    </div>
                    <div className="tokens__stats__progress__line__popup__content__info__game">
                      {get(lastAchievement, 'game.name')}
                    </div>
                    <div
                      data-type={lastAchievement.type}
                      className="tokens__stats__progress__line__popup__content__info__award"
                    >
                      {lastAchievement.karma}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="tokens__stats__progress__goals_title">
            <FormattedMessage id="tokens.goals_title" />
          </div>
          <div className="tokens__stats__progress__goals">
            {stages.map((goal, idx) => (
              <div
                key={goal.achievements}
                className={cn('tokens__stats__progress__goal', {
                  tokens__stats__progress__goal_achieved: goal.achieved,
                  tokens__stats__progress__goal_last: idx === stages.length - 1,
                })}
                style={calcGoalPosition(goal.achievements, maxAchievements)}
              >
                <div className="tokens__stats__progress__goal__circle">
                  <SVGInline svg={checkIcon} />
                </div>
                <div className="tokens__stats__progress__goal__texts" ref={this.stageTextRef}>
                  <div className="tokens__stats__progress__goal__target">
                    <FormattedMessage id="tokens.goal_target" values={{ count: formatNumber(goal.achievements) }} />
                  </div>
                  <div className="tokens__stats__progress__goal__reward">{formatNumber(goal.tokens)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default ProgressBar;
