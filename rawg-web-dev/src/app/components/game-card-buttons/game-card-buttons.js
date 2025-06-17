import React, { Component, useMemo } from 'react';
import PropTypes from 'prop-types';
import Dropdown from 'app/ui/dropdown/dropdown';
import cn from 'classnames';

import { Link } from 'app/components/link';
import { withRouter } from 'react-router';
import plural from 'plural-ru';

import get from 'lodash/get';
import noop from 'lodash/noop';

import {
  saveGameStatus,
  addToWishlist,
  removeGame,
  updatePlatforms,
  skipPlatformsUpdate,
  isAdded,
  isWishlist,
  getAdded,
  // getAddedToWishlist,
} from 'app/components/game-menu-collections/game-menu.helper.js';

import formatNumber from 'tools/format-number';
import checkLogin from 'tools/check-login';
import len from 'tools/array/len';

import GameCardButton from 'app/ui/game-card-button';
import SelectPlatform from 'app/ui/select-platform';
import SelectCategory from 'app/ui/select-category';
import MoreGameOptions from 'app/components/more-game-options';
import Loading from 'app/ui/loading';

import plusIcon from 'assets/icons/plus-small.svg';
import checkIcon from 'assets/icons/check-bold.svg';
import wishlistIcon from 'assets/icons/icon-game-wishlist-white.svg';
import moreIcon from 'assets/icons/more.svg';

import gameType, { GAME_ADDED_STATUSES, GAME_STATUS_OWNED, GAME_STATUS_TOPLAY } from 'app/pages/game/game.types';
import currentUserType from 'app/components/current-user/current-user.types';

import './game-card-buttons.styl';
import passDownProps from 'tools/pass-down-props';

const getOldStatus = (game) => get(game, 'user_game.status', null);

const addedBadgeEnabled = false;

const propTypes = {
  currentUser: currentUserType.isRequired,
  game: gameType.isRequired,
  dispatch: PropTypes.func.isRequired,

  centred: PropTypes.bool,
  withStartedPlaying: PropTypes.bool,
  theme: PropTypes.oneOf(['light', 'dark']),
  removeFromFavourites: PropTypes.bool,
  gameIndex: PropTypes.number,
  onStatusChange: PropTypes.func,
  moreOptionsProperties: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),

  displayPlay: PropTypes.bool,
  location: PropTypes.object,
};

const defaultProps = {
  centred: false,
  withStartedPlaying: false,
  theme: 'light',
  gameIndex: undefined,
  removeFromFavourites: false,
  onStatusChange: noop,
  moreOptionsProperties: undefined,
  displayPlay: false,
};

class GameCardButtons extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.state = {
      showPlatforms: false,
      showCategories: false,
      showMoreOptions: false,
      updatingStatus: false,
      updatingWishlist: false,
    };
  }

  getAddedInner() {
    const { game, withStartedPlaying } = this.props;
    const { added_by_status: addedByStatus, users } = game;
    const added = getAdded(addedByStatus);

    if (added === 0) return null;

    if (addedBadgeEnabled && withStartedPlaying && users && users.count) {
      const addedClassName = cn('game-card-buttons__added', {
        'game-card-buttons__added_active': isAdded(game.user_game),
      });

      return (
        <>
          {added} <span className={addedClassName}>+{formatNumber(users.count)}</span>
        </>
      );
    }

    return added;
  }

  tellAboutStatusChange = (game, newStatus, oldStatus) => {
    this.props.onStatusChange({ game, newStatus, oldStatus });
  };

  addGameHandler = () => {
    const { game, currentUser, dispatch } = this.props;
    const status = GAME_STATUS_OWNED;

    checkLogin(dispatch, () => {
      this.setState({ updatingStatus: true });
      saveGameStatus(dispatch, game).then(() => {
        this.tellAboutStatusChange(game, status, null);
        this.setState({ updatingStatus: false });
      });

      if (currentUser.select_platform && len(game.platforms) > 1) {
        this.showPlatforms();
      }
    });
  };

  platformUpdateHandler = (platformId) => {
    const { game, dispatch } = this.props;

    updatePlatforms(dispatch, game, platformId);
    this.hidePlatforms();
  };

  updateCategoryHandler = (status) => {
    const { game, dispatch } = this.props;
    const { user_game: userGame } = game;
    const oldStatus = getOldStatus(game);

    if (userGame && userGame.status !== status) {
      this.setState({ updatingStatus: true });
      saveGameStatus(dispatch, game, status).then(() => {
        this.tellAboutStatusChange(game, status, oldStatus);
        this.setState({ updatingStatus: false });
      });
    }

    this.hideDropdownsHandler();
  };

  removeGameHandler = () => {
    const { game, dispatch } = this.props;
    const oldStatus = getOldStatus(game);

    this.setState({ updatingStatus: true });
    removeGame(dispatch, game).then(() => {
      this.tellAboutStatusChange(game, null, oldStatus);
      this.setState({ updatingStatus: false });
    });

    this.hideDropdownsHandler();
  };

  openMoreOptionsHandler = () => {
    this.showMoreOptions();
  };

  hideDropdownsHandler = () => {
    this.hidePlatforms();
    this.hideCategories();
    this.hideMoreOptions();
  };

  addToWishlistHandler = () => {
    const { game, dispatch } = this.props;
    const oldStatus = getOldStatus(game);
    const newStatus = oldStatus === GAME_STATUS_TOPLAY ? null : GAME_STATUS_TOPLAY;

    checkLogin(dispatch, () => {
      this.setState({ updatingWishlist: true });
      addToWishlist(dispatch, game).then(() => {
        this.tellAboutStatusChange(game, newStatus, oldStatus);
        this.setState({ updatingWishlist: false });
      });
    });
  };

  disablePlaformsChange = () => {
    skipPlatformsUpdate(this.props.dispatch);

    this.hidePlatforms();
  };

  showPlatforms = () => this.setState({ showPlatforms: true });

  hidePlatforms = () => this.setState({ showPlatforms: false });

  showCategories = () => this.setState({ showCategories: true });

  hideCategories = () => this.setState({ showCategories: false });

  showMoreOptions = () => this.setState({ showMoreOptions: true });

  hideMoreOptions = () => this.setState({ showMoreOptions: false });

  onAddClick = () => {
    const { game } = this.props;
    const isAddedFlag = isAdded(game.user_game);

    if (isAddedFlag) {
      this.showCategories();
    } else {
      this.addGameHandler();
    }
  };

  isAdded() {
    const { user_game: userGame } = this.props.game;

    return userGame && GAME_ADDED_STATUSES.includes(userGame.status);
  }

  isWishlist() {
    const { user_game: userGame } = this.props.game;

    return userGame && userGame.status === 'toplay';
  }

  renderLoader() {
    return <Loading size="small" />;
  }

  renderPlatformsDropdownContent = () => (
    <SelectPlatform
      game={this.props.game}
      handlePlatformsChange={this.platformUpdateHandler}
      disablePlaformsChange={this.disablePlaformsChange}
    />
  );

  renderCategoriesDropdownContent = () => (
    <SelectCategory
      game={this.props.game}
      onCategoryClick={this.updateCategoryHandler}
      onRemoveClick={this.removeGameHandler}
    />
  );

  renderMoreOptionsDropdownContent = () => {
    const { currentUser, game, dispatch, removeFromFavourites, gameIndex, moreOptionsProperties } = this.props;

    return (
      <MoreGameOptions
        isAuthorized={!!currentUser.id}
        game={game}
        dispatch={dispatch}
        closeOptions={this.hideDropdownsHandler}
        removeFromFavourites={removeFromFavourites}
        gameIndex={gameIndex}
        {...passDownProps(moreOptionsProperties, game)}
      />
    );
  };

  render() {
    const { game, centred, theme, location } = this.props;
    // const { added_by_status: addedByStatus } = game;
    const { updatingStatus, updatingWishlist, showPlatforms, showCategories, showMoreOptions } = this.state;

    const isAddedFlag = isAdded(game.user_game);
    const isWishlistFlag = isWishlist(game.user_game);
    const isButtonsDisabled = updatingStatus || updatingWishlist;

    const addIcon = isAddedFlag ? checkIcon : plusIcon;
    // const addedToWishlist = getAddedToWishlist(addedByStatus);

    const className = cn('game-card-buttons', {
      'game-card-buttons_centred': centred,
    });

    const shouldRenderMore = location.pathname.startsWith('/@');

    const playCount = (() => {
      let num = game.plays;

      if (typeof num !== 'number' || num < 10) {
        return '';
      }

      num = String(num);
      num = num.substring(0, num.length - 1) + 0;
      num = Intl.NumberFormat('ru').format(num);

      return `${num}+ игроков`;
    })();

    return (
      <div className={className}>
        {game.can_play ? (
          <div className="game-card-buttons_count">{playCount}</div>
        ) : (
          <>
            <Dropdown
              opened={showPlatforms}
              className="game-card-buttons__dropdown"
              containerClassName="game-card-buttons__dropdown-wrapper"
              kind="card"
              onClose={this.hideDropdownsHandler}
              renderContent={this.renderPlatformsDropdownContent}
            />
            <Dropdown
              opened={showCategories}
              className="game-card-buttons__dropdown"
              containerClassName="game-card-buttons__dropdown-wrapper"
              kind="card"
              onClose={this.hideDropdownsHandler}
              renderContent={this.renderCategoriesDropdownContent}
            />
            <GameCardButton
              onClick={this.onAddClick}
              icon={updatingStatus ? undefined : addIcon}
              inner={updatingStatus ? this.renderLoader() : this.getAddedInner()}
              active={isAddedFlag}
              kind="add"
              theme={theme}
              withArrow={isAddedFlag}
              disabled={isButtonsDisabled}
            />
            <GameCardButton
              onClick={this.addToWishlistHandler}
              icon={updatingWishlist ? undefined : wishlistIcon}
              inner={updatingWishlist ? this.renderLoader() : undefined}
              iconSize={20}
              active={isWishlistFlag}
              kind="wishlist"
              theme={theme}
              disabled={isButtonsDisabled}
            />
            <Dropdown
              opened={showMoreOptions}
              className="game-card-buttons__dropdown"
              containerClassName="game-card-buttons__dropdown-wrapper"
              kind="card"
              onClose={this.hideDropdownsHandler}
              renderedContent={this.renderMoreOptionsDropdownContent()}
            />
          </>
        )}

        {shouldRenderMore && (
          <GameCardButton
            icon={moreIcon}
            iconSize={16}
            onClick={this.openMoreOptionsHandler}
            kind="more"
            theme={theme}
            disabled={isButtonsDisabled}
          />
        )}

        {this.props.displayPlay && game.can_play && (
          <div className="game-card-buttons_online">
            <Link to={`/games/${this.props.game.slug}`}>Играть</Link>
          </div>
        )}
      </div>
    );
  }
}

export default withRouter(GameCardButtons);
