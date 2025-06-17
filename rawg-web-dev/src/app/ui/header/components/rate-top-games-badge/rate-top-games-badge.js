import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';

import paths from 'config/paths';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import appHelper from 'app/pages/app/app.helper';

import BadgeButton from 'app/ui/badge-button';
import ResponsiveImage from 'app/ui/responsive-image';

import dartsIcon from 'app/ui/header/components/rate-top-games-badge/assets/darts.png';
import dartsIcon2x from 'app/ui/header/components/rate-top-games-badge/assets/darts@2x.png';

import { appSizeType } from 'app/pages/app/app.types';
import { currentUserIdType } from 'app/components/current-user/current-user.types';

import './rate-top-games-badge.styl';

export const shouldRenderRateGames = (state) => {
  const currentUserId = state.currentUser.id;
  const ratedGamesPercent = state.currentUser.rated_games_percent;
  const gamesCount = state.currentUser.games_count;

  return !currentUserId || (ratedGamesPercent < 100 && gamesCount > 0);
};

const hoc = compose(
  hot(module),
  connect((state) => ({
    size: state.app.size,
    percent: state.currentUser.rated_games_percent,
    currentUserId: state.currentUser.id,
    shouldRender: shouldRenderRateGames(state),
  })),
);

const componentPropertyTypes = {
  size: appSizeType.isRequired,
  renderPropsFn: PropTypes.func,
  currentUserId: currentUserIdType.isRequired,
  path: PropTypes.string,
  isTag: PropTypes.bool,
  bordered: PropTypes.bool,
};

const defaultProps = {
  renderPropsFn: (badge) => <>{badge}</>,
  path: undefined,
  isTag: false,
  bordered: undefined,
};

class RateTopGamesBadgeComponent extends Component {
  static propTypes = componentPropertyTypes;

  static defaultProps = defaultProps;

  renderBage = () => {
    const { size, currentUserId, path: pathProperty, isTag, bordered } = this.props;
    const isPhone = appHelper.isPhoneSize({ size });
    const path = pathProperty || paths.rateTopGames;

    return (
      <BadgeButton
        path={`${path}?from=header-menu`}
        className="header__rate-top-button"
        mouseHandler={this.mouseHandler}
        isPhone={isPhone}
        currentUserId={currentUserId}
        isExpanded={false}
        kind="top"
        isTag={isTag}
        bordered={bordered}
      >
        <ResponsiveImage
          className="header__rate-top-icon"
          image={{
            simple: dartsIcon,
            retina: dartsIcon2x,
          }}
          title="rate top games"
          alt="rate top games"
        />
        <SimpleIntlMessage id="profile.rate_top_games_badge" />
      </BadgeButton>
    );
  };

  render() {
    const { renderPropsFn } = this.props;

    return renderPropsFn(this.renderBage());
  }
}

const RateTopGamesBadge = hoc(RateTopGamesBadgeComponent);

export default RateTopGamesBadge;
