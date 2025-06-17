import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'recompose';

import paths from 'config/paths';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import appHelper from 'app/pages/app/app.helper';
import { appSizeType } from 'app/pages/app/app.types';
import { updateSetting } from 'app/components/current-user/current-user.actions';

import BadgeButton from 'app/ui/badge-button';
import ResponsiveImage from 'app/ui/responsive-image';

import okIcon from 'app/ui/header/components/maybe-rate-games/assets/ok.png';
import okIcon2x from 'app/ui/header/components/maybe-rate-games/assets/ok@2x.png';

import { currentUserIdType } from 'app/components/current-user/current-user.types';

import './maybe-rate-games.styl';

export const shouldRenderRateGames = (state) => {
  const currentUserId = state.currentUser.id;
  const ratedGamesPercent = state.currentUser.rated_games_percent;
  const gamesCount = state.currentUser.games_count;

  return !currentUserId || (ratedGamesPercent < 100 && gamesCount > 0);
};

const hoc = compose(
  connect((state) => ({
    size: state.app.size,
    percent: state.currentUser.rated_games_percent,
    currentUserId: state.currentUser.id,
    shouldRender: shouldRenderRateGames(state),
  })),
);

const componentPropertyTypes = {
  percent: PropTypes.number.isRequired,
  shouldRender: PropTypes.bool.isRequired,
  size: appSizeType.isRequired,
  renderPropsFn: PropTypes.func,
  dispatch: PropTypes.func.isRequired,
  currentUserId: currentUserIdType.isRequired,
  isTag: PropTypes.bool,
  bordered: PropTypes.bool,
};

const defaultProps = {
  renderPropsFn: (badge) => <>{badge}</>,
  isTag: false,
  bordered: false,
};

class MaybeRateGamesComponent extends Component {
  static propTypes = componentPropertyTypes;

  static defaultProps = defaultProps;

  constructor(props, context) {
    super(props, context);

    this.state = {
      isExpanded: false,
    };
  }

  mouseHandler = (event) => {
    if (event && event.type === 'mouseenter') {
      this.setState({ isExpanded: true });
    } else {
      this.setState({ isExpanded: false });
    }
  };

  removeRatingBage = () => {
    const { dispatch } = this.props;

    dispatch(updateSetting('isRatedHidden', true));
  };

  renderBage = () => {
    const { percent, size, currentUserId, isTag, bordered } = this.props;
    const { isExpanded } = this.state;

    const isPhone = appHelper.isPhoneSize({ size });
    const path = paths.rateUserGames;

    return (
      <BadgeButton
        path={path}
        className="header__rate-button"
        isExpanded={isExpanded}
        mouseHandler={this.mouseHandler}
        removeRatingBage={isExpanded ? this.removeRatingBage : undefined}
        isPhone={isPhone}
        currentUserId={currentUserId}
        isTag={isTag}
        bordered={bordered}
      >
        <ResponsiveImage
          className="header__rate-icon"
          image={{
            simple: okIcon,
            retina: okIcon2x,
          }}
          title="rate games"
          alt="rate games"
        />
        <SimpleIntlMessage id="profile.rate_games_badge" />
        {isExpanded && isTag && <span className="header__rate-percent">{percent}%</span>}
      </BadgeButton>
    );
  };

  render() {
    const { shouldRender, renderPropsFn } = this.props;

    return shouldRender && renderPropsFn(this.renderBage());
  }
}

const MaybeRateGames = hoc(MaybeRateGamesComponent);

export default MaybeRateGames;
