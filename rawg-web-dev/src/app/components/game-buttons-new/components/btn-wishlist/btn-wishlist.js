/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';
import { injectIntl, FormattedMessage } from 'react-intl';
import cn from 'classnames';

import './btn-wishlist.styl';

import checkLogin from 'tools/check-login';
import id from 'tools/id';

import gameType, { GAME_STATUS_TOPLAY } from 'app/pages/game/game.types';
import intlShape from 'tools/prop-types/intl-shape';
import { addToWishlist, getAddedToWishlist } from 'app/components/game-menu-collections/game-menu.helper';

import Loading from 'app/ui/loading';

const hoc = compose(
  hot,
  injectIntl,
);

const propTypes = {
  game: gameType.isRequired,
  dispatch: PropTypes.func.isRequired,
  intl: intlShape.isRequired,
};

const defaultProps = {};

class ButtonWishlistComponent extends React.Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(properties, context) {
    super(properties, context);

    this.state = {
      updatingStatus: false,
    };
  }

  onBtnClick = (event) => {
    event.preventDefault();

    const { game, dispatch } = this.props;

    checkLogin(dispatch, () => {
      this.setState({ updatingStatus: true });

      addToWishlist(dispatch, game).finally(() => {
        this.setState({ updatingStatus: false });
      });
    });
  };

  getSubtitle = () => {
    const { game, intl } = this.props;

    if (game.user_game && game.user_game.status === GAME_STATUS_TOPLAY) {
      return intl.formatMessage(id('game-statuses.added_to'));
    }

    return intl.formatMessage(id('game-statuses.add_to'));
  };

  getTitle = () => {
    const { game } = this.props;
    const { added_by_status: addedByStatus } = game;
    const { updatingStatus } = this.state;

    const loadingIcon = updatingStatus && (
      <div className="btn-wishlist__icon-loading">
        <Loading size="x-small" className="loading_white" />
      </div>
    );

    const added = getAddedToWishlist(addedByStatus);
    const counter = added > 0 && <span className="btn-wishlist__title__counter">{added}</span>;

    return (
      <>
        <FormattedMessage id="game-statuses.wishlist-counter" values={{ counter }} />
        {loadingIcon}
      </>
    );
  };

  getIcon = () => {
    const { game } = this.props;

    if (game.user_game && game.user_game.status === GAME_STATUS_TOPLAY) {
      return <div className={`btn-wishlist__icon btn-wishlist__icon-${game.user_game.status}`} />;
    }

    return <div className="btn-wishlist__icon btn-wishlist__icon-plus" />;
  };

  render() {
    const { game } = this.props;
    const isActive = game.user_game && game.user_game.status === GAME_STATUS_TOPLAY;

    return (
      <>
        <div
          className={cn('btn-wishlist', {
            'btn-wishlist_inactive': !isActive,
            'btn-wishlist_active': isActive,
          })}
          onClick={this.onBtnClick}
          role="button"
          tabIndex={0}
        >
          <div className="btn-wishlist__text">
            <div className="btn-wishlist__subtitle">{this.getSubtitle()}</div>
            <div className="btn-wishlist__title">{this.getTitle()}</div>
          </div>
          {this.getIcon()}
        </div>
      </>
    );
  }
}

ButtonWishlistComponent.propTypes = propTypes;
ButtonWishlistComponent.defaultProps = defaultProps;

const ButtonWishlist = hoc(ButtonWishlistComponent);

export default ButtonWishlist;
