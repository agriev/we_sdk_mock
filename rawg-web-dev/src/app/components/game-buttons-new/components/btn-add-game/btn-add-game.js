/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';
import cn from 'classnames';
import { injectIntl } from 'react-intl';

import './btn-add-game.styl';

import get from 'lodash/get';

import checkLogin from 'tools/check-login';
import simpleTruncate from 'tools/string/simple-truncate';
import len from 'tools/array/len';
import id from 'tools/id';

import appHelper from 'app/pages/app/app.helper';

import gameType, { GAME_ADDED_STATUSES, GAME_STATUS_TOPLAY } from 'app/pages/game/game.types';

import currentUserType from 'app/components/current-user/current-user.types';
import { appSizeType } from 'app/pages/app/app.types';
import intlShape from 'tools/prop-types/intl-shape';

import {
  saveGameStatus,
  isAdded,
  removeGame,
  updatePlatforms,
  skipPlatformsUpdate,
  getAdded,
} from 'app/components/game-menu-collections/game-menu.helper';

import SelectPlatform from 'app/ui/select-platform';
import Dropdown from 'app/ui/dropdown';
import SelectCategory from 'app/ui/select-category';
import Loading from 'app/ui/loading';

const propTypes = {
  game: gameType.isRequired,
  currentUser: currentUserType.isRequired,
  dispatch: PropTypes.func.isRequired,
  appSize: appSizeType.isRequired,
  intl: intlShape.isRequired,
};

const defaultProps = {};

@hot
@injectIntl
class ButtonAddGame extends React.Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(properties, context) {
    super(properties, context);

    this.btnRef = React.createRef();
    this.state = {
      showPlatforms: false,
      showCategories: false,
      updatingStatus: false,
    };
  }

  onAddClick = (event) => {
    event.preventDefault();

    const { game } = this.props;

    if (isAdded(game.user_game)) {
      this.setState({ showCategories: true });
    } else {
      this.addGame();
    }
  };

  getSubtitle = () => {
    const { game, intl } = this.props;

    if (game.user_game && game.user_game.status === GAME_STATUS_TOPLAY) {
      return intl.formatMessage(id('game-statuses.added_to'));
    }

    return intl.formatMessage(id('game-statuses.add_to'));
  };

  getTitle = () => {
    const { game, intl, appSize } = this.props;
    const { added_by_status: addedByStatus } = game;
    const { updatingStatus } = this.state;

    const added = getAdded(addedByStatus);
    const counter = added > 0 && <div className="btn-add-game__title__counter">{added}</div>;
    const loadingIcon = updatingStatus ? (
      <div className="btn-add-game__icon-loading">
        <Loading size="x-small" />
      </div>
    ) : null;

    if (game.user_game && game.user_game.status !== GAME_STATUS_TOPLAY) {
      const statusTitleString = intl.formatMessage({
        id: `profile.tab_${game.user_game.status}`,
      });

      const arrow = <div className="btn-add-game__title__arrow" />;
      const statusTitle = appHelper.isDesktopSize(appSize) ? simpleTruncate(13, statusTitleString) : statusTitleString;

      return (
        <>
          {statusTitle}
          {arrow}
          {counter}
          {loadingIcon}
        </>
      );
    }

    return (
      <>
        {intl.formatMessage(id('game-statuses.my_games'))}
        {counter}
        {loadingIcon}
      </>
    );
  };

  getIcon = () => {
    const { game } = this.props;

    if (game.user_game && game.user_game.status !== GAME_STATUS_TOPLAY) {
      return (
        <div className="btn-add-game__icon-container">
          <div className={`btn-add-game__icon btn-add-game__icon-${game.user_game.status}`} />
        </div>
      );
    }

    return (
      <div className="btn-add-game__icon-container">
        <div className="btn-add-game__icon btn-add-game__icon-plus" />
      </div>
    );
  };

  addGame = () => {
    const { game, currentUser, dispatch } = this.props;

    checkLogin(dispatch, () => {
      this.setState({ updatingStatus: true });

      saveGameStatus(dispatch, game).then(() => {
        this.setState({ updatingStatus: false });
      });

      if (currentUser.select_platform && len(game.platforms) > 1) {
        this.setState({ showPlatforms: true });
      }
    });
  };

  removeGame = () => {
    const { game, dispatch } = this.props;

    this.setState({ updatingStatus: true });
    removeGame(dispatch, game).then(() => {
      this.setState({ updatingStatus: false });
    });

    this.hideDropdowns();
  };

  platformUpdateHandler = (platformId) => {
    const { game, dispatch } = this.props;

    updatePlatforms(dispatch, game, platformId);

    this.setState({ showPlatforms: false });
  };

  disablePlaformsChange = () => {
    skipPlatformsUpdate(this.props.dispatch);

    this.setState({ showPlatforms: false });
  };

  updateCategory = (status) => {
    const { game, dispatch } = this.props;
    const { user_game: userGame } = game;

    if (userGame && userGame.status !== status) {
      this.setState({ updatingStatus: true });
      saveGameStatus(dispatch, game, status).then(() => {
        this.setState({ updatingStatus: false });
      });
    }

    this.hideDropdowns();
  };

  hideDropdowns = () => {
    this.setState({ showPlatforms: false, showCategories: false });
  };

  renderPlatformsDropdown() {
    const { game } = this.props;
    const { showPlatforms } = this.state;

    const dropdownContent = () => (
      <SelectPlatform
        game={game}
        handlePlatformsChange={this.platformUpdateHandler}
        disablePlaformsChange={this.disablePlaformsChange}
      />
    );

    return (
      <Dropdown
        opened={showPlatforms}
        className="game-card-buttons__dropdown"
        containerClassName="game-card-buttons__dropdown-wrapper"
        kind="card"
        onClose={this.hideDropdowns}
        renderContent={dropdownContent}
      />
    );
  }

  renderCategoriesDropdown() {
    const { game } = this.props;
    const { showCategories } = this.state;

    const dropdownContent = () => (
      <div className="btn-add-game__categories">
        {this.renderContent()}
        <SelectCategory game={game} onCategoryClick={this.updateCategory} onRemoveClick={this.removeGame} />
      </div>
    );

    return (
      <Dropdown
        opened={showCategories}
        className="game-card-buttons__dropdown"
        containerClassName="game-card-buttons__dropdown-wrapper"
        kind="card"
        onClose={this.hideDropdowns}
        renderContent={dropdownContent}
        sameWidth={this.btnRef.current}
      />
    );
  }

  renderContent() {
    return (
      <div className="btn-add-game__content">
        <div className="btn-add-game__text">
          <div className="btn-add-game__subtitle">{this.getSubtitle()}</div>
          <div className="btn-add-game__title">{this.getTitle()}</div>
        </div>
        {this.getIcon()}
      </div>
    );
  }

  render() {
    const { game } = this.props;
    const status = get(game, 'user_game.status');

    return (
      <>
        {this.renderPlatformsDropdown()}
        {this.renderCategoriesDropdown()}
        <div
          ref={this.btnRef}
          className={cn('btn-add-game', {
            'btn-add-game_inactive': game.user_game === null,
            'btn-add-game_active': game.user_game !== null && GAME_ADDED_STATUSES.includes(status),
          })}
          onClick={this.onAddClick}
          role="button"
          tabIndex={0}
        >
          {this.renderContent()}
        </div>
      </>
    );
  }
}

export default ButtonAddGame;
