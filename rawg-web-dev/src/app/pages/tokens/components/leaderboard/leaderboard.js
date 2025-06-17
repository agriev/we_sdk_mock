/* eslint-disable sonarjs/no-small-switch */

import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { Element } from 'react-scroll';
import { shallowEqual } from 'recompose';

import appHelper from 'app/pages/app/app.helper';
import currentUserType from 'app/components/current-user/current-user.types';
import Slider from 'app/ui/slider';
import Button from 'app/ui/button';
import { appSizeType } from 'app/pages/app/app.types';
import Arrow from 'app/ui/arrow';
import Loading from 'app/ui/loading';
import Scroller from 'app/ui/scroller';
import { leaderboardFirstType, leaderboardUserType } from 'app/pages/tokens/tokens.data.types';
import { loadLeaderboardUser, loadLeaderboardFirst } from 'app/pages/tokens/tokens.data.actions';

import TokensHeader from 'app/pages/tokens/components/tokens-header';

import tokensDashboardTypes, {
  STATUS_COMPLETED,
  STATUS_ACTIVE,
  STATUS_FAILURE,
  status as statusType,
} from 'app/pages/tokens/tokens.types';

import Position from './components/position';
import Sidebar from './components/sidebar';

import './leaderboard.styl';

@hot(module)
@connect((state) => ({
  currentUser: state.currentUser,
  size: state.app.size,
  leaderboardFirst: state.tokensDashboardData.leaderboard.first,
  leaderboardUser: state.tokensDashboardData.leaderboard.user,
  tokensDashboard: state.tokensDashboard,
  status: state.tokensDashboard.status,
}))
class TokensLeaderboard extends React.Component {
  static propTypes = {
    currentUser: currentUserType.isRequired,
    dispatch: PropTypes.func.isRequired,
    leaderboardFirst: leaderboardFirstType.isRequired,
    leaderboardUser: leaderboardUserType.isRequired,
    tokensDashboard: tokensDashboardTypes.isRequired,
    status: statusType.isRequired,
    size: appSizeType.isRequired,
    setActiveSection: PropTypes.func.isRequired,
  };

  static defaultProps = {};

  componentDidMount() {
    const { dispatch, currentUser } = this.props;
    if (currentUser.id) {
      dispatch(loadLeaderboardUser());
    }
  }

  getTitle = () => {
    const { status, currentUser } = this.props;

    switch (status) {
      case STATUS_COMPLETED:
      case STATUS_FAILURE:
        if (currentUser.token_program) {
          return <FormattedMessage id="tokens.leaderboard_title_completed_member" values={{ topPercent: 20 }} />;
        }
        return <FormattedMessage id="tokens.leaderboard_title_completed_guest" />;

      default:
        if (currentUser.token_program) {
          return <FormattedMessage id="tokens.leaderboard_title_active_member" />;
        }
        return <FormattedMessage id="tokens.leaderboard_title_active_guest" />;
    }
  };

  getSubTitle = () => {
    const { status, currentUser, leaderboardFirst, tokensDashboard } = this.props;
    switch (status) {
      case STATUS_COMPLETED:
        if (currentUser.token_program) {
          return (
            <FormattedMessage
              id="tokens.leaderboard_subtitle_completed_member"
              values={{
                position: tokensDashboard.current_user.position,
                count: leaderboardFirst.count,
              }}
            />
          );
        }
        return undefined;
      default:
        return undefined;
    }
  };

  getPosition = () => {
    const { status, currentUser } = this.props;
    switch (status) {
      case STATUS_ACTIVE:
        return 2;
      case STATUS_COMPLETED:
        if (currentUser.id) return '🎯';
        return '🎮';
      case STATUS_FAILURE:
        return '🎮';
      default:
        return '';
    }
  };

  loadFirst = () => {
    const { leaderboardFirst, dispatch } = this.props;
    return dispatch(loadLeaderboardFirst(leaderboardFirst.next));
  };

  loadUser = () => {
    const { leaderboardUser, dispatch } = this.props;
    return dispatch(loadLeaderboardUser(leaderboardUser.next));
  };

  activateSection = () => {
    this.props.setActiveSection('leaderboard');
  };

  firstResultsNotHaveCurrentUser = () => {
    const currentUserId = this.props.currentUser.id;
    const { leaderboardFirst } = this.props;
    const userIdSame = (pos) => pos.user.id === currentUserId;

    return !leaderboardFirst.results.some(userIdSame);
  };

  resultsAreDifferent = () => {
    const { leaderboardFirst, leaderboardUser } = this.props;

    const leaderboardFirstIds = leaderboardFirst.results.map((res) => res.user.id);
    const leaderboardUserIds = leaderboardUser.results.map((res) => res.user.id);

    return !shallowEqual(leaderboardFirstIds, leaderboardUserIds);
  };

  renderLoadMore = (data, loadFunc, size) => {
    if (appHelper.isDesktopSize({ size })) {
      return [
        data.next && data.count > 0 && !data.loading && (
          <div key="load-btn" className="tokens__leaderboard__more-games">
            <div className="tokens__leaderboard__more-games-line" />
            <div className="tokens__leaderboard__more-games-button" onClick={loadFunc} role="button" tabIndex={0}>
              <FormattedMessage id="shared.view_more" />
              <Arrow className="tokens__leaderboard__more-games-button-icon" size="small" direction="bottom" />
            </div>
            <div className="tokens__leaderboard__more-games-line" />
          </div>
        ),
        data.loading && <Loading key="loading-icon" className="tokens__leaderboard__loading" size="large" />,
      ];
    }

    if (data.next && data.count > 0) {
      return [
        <Button
          key="load-btn"
          className="tokens__leaderboard__more-games-phone-button"
          kind="fill"
          size="medium"
          disabled={data.loading}
          loading={data.loading}
          onClick={loadFunc}
        >
          <FormattedMessage id="shared.view_more" />
        </Button>,
      ];
    }

    return [];
  };

  render() {
    const { leaderboardFirst, leaderboardUser, size, status, currentUser } = this.props;

    const headerClassName = status !== STATUS_ACTIVE ? 'tokens-header_max-opacity' : '';

    const needRenderUserBoard = currentUser.id && this.firstResultsNotHaveCurrentUser() && this.resultsAreDifferent();

    const pos = (item) => <Position key={item.position} position={item} currentUser={currentUser} size={size} />;

    return [
      <div key="header" className="tokens__leaderboard-header-container">
        <Scroller
          onReach={{
            top: this.activateSection,
            bottom: this.activateSection,
            offset: 100,
          }}
        />
        <Element name="tokens.leaderboard" />
        <TokensHeader
          position={this.getPosition()}
          title={this.getTitle()}
          subtitle={this.getSubTitle()}
          className={headerClassName}
        />
      </div>,
      <div key="content" className="tokens__leaderboard-container">
        <div className="tokens__leaderboard">
          <div className="tokens__leaderboard-wrap">
            <div className="tokens__leaderboard__headings">
              {appHelper.isDesktopSize({ size }) && [
                <div key="name" className="tokens__leaderboard__heading">
                  <FormattedMessage id="tokens.leaderboard_name" />
                </div>,
                <div key="achievements" className="tokens__leaderboard__heading">
                  <FormattedMessage id="tokens.leaderboard_achievements" />
                </div>,
              ]}
              {appHelper.isPhoneSize({ size }) && (
                <div className="tokens__leaderboard__heading">
                  <FormattedMessage id="tokens.leaderboard_name_and_achievements" />
                </div>
              )}
              <div className="tokens__leaderboard__heading">
                <FormattedMessage id="tokens.leaderboard_karma" />
              </div>
            </div>
            <div className="tokens__leaderboard__items">
              {leaderboardFirst.count === 0 &&
                !leaderboardFirst.loading && [
                  <div key="empty-icon" className="tokens__leaderboard__items__empty-icon" />,
                  <div key="empty-text" className="tokens__leaderboard__items__empty-text">
                    <FormattedMessage id="tokens.earned_achievements_here_you_will_have_achievements" />
                  </div>,
                ]}
              {leaderboardFirst.results.map(pos)}
            </div>
            {this.renderLoadMore(leaderboardFirst, this.loadFirst, size)}
            {needRenderUserBoard && [
              <div key="items" className="tokens__leaderboard__items tokens__leaderboard__items_user">
                {leaderboardUser.results.map(pos)}
              </div>,
              ...this.renderLoadMore(leaderboardUser, this.loadUser, size),
            ]}
          </div>
          <Scroller
            onReach={{
              top: this.activateSection,
              bottom: this.activateSection,
              offset: 100,
            }}
          />
        </div>
        <div className="tokens__leaderboard-sidebar">
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

export default TokensLeaderboard;
