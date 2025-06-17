import React, { Component } from 'react';
import PropTypes from 'prop-types';

import isString from 'lodash/isString';

import './more-game-options.styl';

import checkLogin from 'tools/check-login';

import { setBackground, removeProfileFavouriteGame } from 'app/pages/profile/profile.actions';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import ReviewManager from 'app/components/review-manager';

import gameType from 'app/pages/game/game.types';

import MoreGameOptionsCollections from './components/collections';
import MoreGameOptionsButton from './components/button';

export const MORE_OPTIONS_BTN_FAVOURITES = 'favourites';
export const MORE_OPTIONS_BTN_COLLECTIONS = 'collections';
export const MORE_OPTIONS_BTN_SET_PROFILE_BG = 'set-profile-background';

export const moreOptionsDefaultButtons = [
  // MORE_OPTIONS_BTN_FAVOURITES,
  MORE_OPTIONS_BTN_SET_PROFILE_BG,
  MORE_OPTIONS_BTN_COLLECTIONS,
];

const propTypes = {
  isAuthorized: PropTypes.bool.isRequired,
  game: gameType.isRequired,
  dispatch: PropTypes.func.isRequired,
  closeOptions: PropTypes.func.isRequired,
  removeFromFavourites: PropTypes.bool,
  gameIndex: PropTypes.number,
  buttons: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.string,
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        children: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
        onClick: PropTypes.func,
        to: PropTypes.string,
      }),
    ]),
  ),
};

const defaultProps = {
  removeFromFavourites: false,
  gameIndex: undefined,
  buttons: moreOptionsDefaultButtons,
};

class MoreGameOptions extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.state = { isCollectionSubmenuOpen: false };
  }

  onClickToCollectionsBtn = () => {
    checkLogin(this.props.dispatch, () => {
      this.setState({ isCollectionSubmenuOpen: true });
    });
  };

  renderFavouritesBtn = () => {
    const { isAuthorized, removeFromFavourites } = this.props;
    const { dispatch, gameIndex } = this.props;

    if (!removeFromFavourites || !isAuthorized) {
      return null;
    }

    const removeFromFavouritesHandler = () => {
      dispatch(removeProfileFavouriteGame({ position: gameIndex }));
    };

    return (
      <MoreGameOptionsButton
        key="add-to-favourites-btn"
        className="more-game-options__button_red"
        onClick={removeFromFavouritesHandler}
      >
        <SimpleIntlMessage id="profile.overview_favourite_games_remove" />
      </MoreGameOptionsButton>
    );
  };

  renderSetProfileBackgroundBtn = () => {
    const { isAuthorized } = this.props;
    const { dispatch, game, closeOptions } = this.props;

    if (!isAuthorized) {
      return null;
    }

    const setBackgroundHandler = () => {
      dispatch(setBackground(game));
      closeOptions();
    };

    return (
      <MoreGameOptionsButton key="set-profile-background-btn" onClick={setBackgroundHandler}>
        <SimpleIntlMessage id="shared.games_card_background" />
      </MoreGameOptionsButton>
    );
  };

  renderCustomBtn = ({ key, onClick, to, children }) => {
    const { game } = this.props;

    const clickHandler = () => {
      onClick(game);

      this.props.closeOptions();
    };

    return (
      <MoreGameOptionsButton key={key} onClick={clickHandler} to={to}>
        {children}
      </MoreGameOptionsButton>
    );
  };

  renderOptions() {
    /* eslint-disable react/no-array-index-key */
    const { game, dispatch, closeOptions, buttons, removeFromFavourites } = this.props;

    const btns = removeFromFavourites ? [MORE_OPTIONS_BTN_FAVOURITES, ...buttons] : buttons;

    const buttonFuncMap = {
      [MORE_OPTIONS_BTN_COLLECTIONS]: this.renderCollectionSubmenu,
      [MORE_OPTIONS_BTN_FAVOURITES]: this.renderFavouritesBtn,
      [MORE_OPTIONS_BTN_SET_PROFILE_BG]: this.renderSetProfileBackgroundBtn,
    };

    return (
      <>
        <div className="more-game-options__top">
          <ReviewManager game={game} dispatch={dispatch} closeOptions={closeOptions} />
        </div>
        <div className="more-game-options__bottom">
          {btns.map((button, idx) => {
            if (isString(button)) {
              return buttonFuncMap[button]();
            }

            if (button) {
              return this.renderCustomBtn(button, idx);
            }

            return null;
          })}
        </div>
      </>
    );
  }

  renderCollectionSubmenu = () => {
    const { game, dispatch } = this.props;
    const { isCollectionSubmenuOpen } = this.state;

    return (
      <MoreGameOptionsCollections
        key="collections-edit"
        game={game}
        dispatch={dispatch}
        showButton={!isCollectionSubmenuOpen}
        openCollectionMenu={this.onClickToCollectionsBtn}
      />
    );
  };

  render() {
    const { isCollectionSubmenuOpen } = this.state;

    return (
      <div className="more-game-options">
        {isCollectionSubmenuOpen ? this.renderCollectionSubmenu() : this.renderOptions()}
      </div>
    );
  }
}

export default MoreGameOptions;
