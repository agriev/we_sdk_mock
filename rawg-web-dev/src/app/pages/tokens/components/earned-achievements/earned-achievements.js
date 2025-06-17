import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { FormattedMessage } from 'react-intl';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';
import { Element } from 'react-scroll';

import './earned-achievements.styl';
import LoadMore from 'app/ui/load-more/load-more';
import { appSizeType } from 'app/pages/app/app.types';
import appHelper from 'app/pages/app/app.helper';
import Slider from 'app/ui/slider';
import Scroller from 'app/ui/scroller';

import currentUserType from 'app/components/current-user/current-user.types';
import { loadEarnedAchievements } from 'app/pages/tokens/tokens.data.actions';
import { earnedAchievementsType } from 'app/pages/tokens/tokens.data.types';

import { discordUrl } from 'app/pages/app/app.consts';

import TokensHeader from 'app/pages/tokens/components/tokens-header';

import tokensDashboardTypes, {
  status as statusType,
  STATUS_COMPLETED,
  STATUS_FAILURE,
  STATUS_NEW,
} from 'app/pages/tokens/tokens.types';

import Achievement from './components/achievement';
import Sidebar from './components/sidebar';

const hoc = compose(
  hot(module),
  connect((state) => ({
    currentUser: state.currentUser,
    status: state.tokensDashboard.status,
    earnedAchievements: state.tokensDashboardData.earnedAchievements,
    tokensDashboard: state.tokensDashboard,
    size: state.app.size,
  })),
);

const componentPropertyTypes = {
  className: PropTypes.string,
  status: statusType.isRequired,
  currentUser: currentUserType.isRequired,
  earnedAchievements: earnedAchievementsType.isRequired,
  tokensDashboard: tokensDashboardTypes.isRequired,
  size: appSizeType.isRequired,
  dispatch: PropTypes.func.isRequired,
  setActiveSection: PropTypes.func.isRequired,
};

const defaultProps = {
  className: '',
};

@hoc
class TokensDashboardEarnedAchievements extends React.Component {
  static propTypes = componentPropertyTypes;

  static defaultProps = defaultProps;

  componentDidMount() {
    const { dispatch } = this.props;
    dispatch(loadEarnedAchievements());
  }

  load = () => {
    const { earnedAchievements, dispatch } = this.props;
    return dispatch(loadEarnedAchievements(earnedAchievements.next));
  };

  activateSection = () => {
    this.props.setActiveSection('achievements');
  };

  render() {
    const { className, earnedAchievements, size, status, currentUser, tokensDashboard } = this.props;

    if ((status === STATUS_COMPLETED && !currentUser.token_program) || [STATUS_FAILURE, STATUS_NEW].includes(status)) {
      return null;
    }

    const title =
      status === STATUS_COMPLETED ? (
        <FormattedMessage
          id="tokens.earned_achievements_title_completed"
          values={{
            points: <span className="tokens__earned-achievements__wreaths">{tokensDashboard.current_user.karma}</span>,
          }}
        />
      ) : (
        <div>
          <FormattedMessage id="tokens.earned_achievements_title_active" />
          <span className="tokens__earned-achievements__wreaths">
            <FormattedMessage id="tokens.earned_achievements_title_active_karma" />
          </span>
        </div>
      );

    const subtitle =
      status === STATUS_COMPLETED ? (
        <FormattedMessage
          id="tokens.earned_achievements_subtitle_completed"
          values={{
            count: tokensDashboard.current_user.achievements,
            place: tokensDashboard.current_user.position,
          }}
        />
      ) : (
        undefined
      );

    const position = status === STATUS_COMPLETED ? '🏆' : 1;

    const headerClassName = status === STATUS_COMPLETED ? 'tokens-header_max-opacity' : '';

    return [
      appHelper.isPhoneSize({ size }) && (
        <a
          key="discord"
          href={discordUrl}
          className="tokens__earned-achievements-discord separated"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FormattedMessage id="tokens.earned_achievements_discord" />
        </a>
      ),
      <div key="header" className="tokens__earned-achievements-header-container">
        <Scroller
          onReach={{
            top: this.activateSection,
            bottom: this.activateSection,
            offset: 100,
          }}
        />
        <Element name="tokens.achievements" />
        <TokensHeader position={position} title={title} subtitle={subtitle} className={headerClassName} />
      </div>,
      <div key="content" className={cn('tokens__earned-achievements-container', className)}>
        <div className="tokens__earned-achievements">
          <div className="tokens__earned-achievements-wrap">
            {earnedAchievements.count > 0 && (
              <div className="tokens__earned-achievements__headings">
                {appHelper.isDesktopSize({ size }) && [
                  <div key="ach-and-date" className="tokens__earned-achievements__heading">
                    <FormattedMessage id="tokens.earned_achievements_achievement_and_date" />
                  </div>,
                  <div key="game" className="tokens__earned-achievements__heading">
                    <FormattedMessage id="tokens.earned_achievements_game" />
                  </div>,
                ]}
                {appHelper.isPhoneSize({ size }) && (
                  <div key="game" className="tokens__earned-achievements__heading">
                    <FormattedMessage id="tokens.earned_achievements_achievement_game_and_date" />
                  </div>
                )}
                <div className="tokens__earned-achievements__heading">
                  <FormattedMessage id="tokens.earned_achievements_reward" />
                </div>
              </div>
            )}
            <div className="tokens__earned-achievements__items">
              {earnedAchievements.count === 0 &&
                !earnedAchievements.loading && [
                  <div key="empty-icon" className="tokens__earned-achievements__items__empty-icon" />,
                  <div key="empty-text" className="tokens__earned-achievements__items__empty-text">
                    <FormattedMessage id="tokens.earned_achievements_here_you_will_have_achievements" />
                  </div>,
                ]}

              <LoadMore
                appSize={size}
                load={this.load}
                count={earnedAchievements.count}
                next={earnedAchievements.next}
                loading={earnedAchievements.loading}
              >
                {earnedAchievements.results.map((ach, idx) => (
                  <Achievement
                    key={ach.id}
                    index={idx}
                    achievement={ach}
                    allCount={earnedAchievements.count}
                    size={size}
                  />
                ))}
              </LoadMore>
            </div>
          </div>
          <Scroller
            onReach={{
              top: this.activateSection,
              bottom: this.activateSection,
              offset: 100,
            }}
          />
        </div>
        <div className="tokens__earned-achievements-sidebar">
          {appHelper.isDesktopSize({ size }) && <Sidebar size={size} />}
          {appHelper.isPhoneSize({ size }) && (
            <Slider arrows={false} infinite={false} variableWidth dots>
              {Sidebar({ size })}
            </Slider>
          )}
        </div>
      </div>,
    ];
  }
}

export default TokensDashboardEarnedAchievements;
