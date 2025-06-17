import React, { Component } from 'react';
import { Link } from 'app/components/link';
import { hot } from 'react-hot-loader/root';
import PropTypes from 'prop-types';

import isFinite from 'lodash/isFinite';
import isArray from 'lodash/isArray';

import keysEqual from 'tools/keys-equal';
import crop from 'tools/img/crop';

import paths from 'config/paths';

import GameCardButtons from 'app/components/game-card-buttons';
import Rating from 'app/ui/rating';
import Platforms from 'app/ui/platforms';
import UserListLine from 'app/ui/user-list-line';

import gameType from 'app/pages/game/game.types';
import currentUserType from 'app/components/current-user/current-user.types';

import './game-card-featured.styl';

const propTypes = {
  currentUser: currentUserType.isRequired,
  dispatch: PropTypes.func.isRequired,
  game: gameType.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,

  withStartedPlaying: PropTypes.bool,
  number: PropTypes.number,
  removeFromFavourites: PropTypes.bool,
  onStatusChange: PropTypes.func,
};

const defaultProps = {
  withStartedPlaying: false,
  removeFromFavourites: false,
  number: undefined,
  onStatusChange: undefined,
};

@hot
class GameCardFeatured extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.state = {
      playing: false,
      opened: false,
    };

    this.ref = React.createRef();
  }

  shouldComponentUpdate(nextProperties, nextState) {
    const propsIsDifferent = !keysEqual(this.props, nextProperties, [
      'currentUser',
      'game.user_game',
      'game.user_review',
      'width',
      'size',
    ]);

    const stateIsDifferent = !keysEqual(this.state, nextState, ['opened', 'playing']);

    return propsIsDifferent || stateIsDifferent;
  }

  getCardStyle() {
    const { game } = this.props;
    return { backgroundImage: `url('${crop([600, 700], game.background_image)}')` };
  }

  renderUsers() {
    const { users } = this.props.game;

    return users && users.count > 0 && <UserListLine noCount className="game-card-featured__user-list" users={users} />;
  }

  renderRating() {
    const { rating_top: id, allRatings } = this.props.game;

    return !!id && <Rating className="game-card-featured__rating" rating={id} allRatings={allRatings} kind="emoji" />;
  }

  renderPlatforms() {
    const { platforms, parent_platforms: parentPlatforms } = this.props.game;

    if (!isArray(platforms)) {
      return null;
    }

    return (
      <Platforms
        className="game-card-featured__platforms"
        platforms={platforms}
        parentPlatforms={parentPlatforms}
        size="medium"
        maxItems={3}
      />
    );
  }

  renderMeta() {
    return (
      <div className="game-card-featured__meta">
        {this.renderRating()}
        {this.renderPlatforms()}
      </div>
    );
  }

  renderTitle() {
    const { game } = this.props;
    const { name, slug } = game;

    return (
      <Link className="game-card-featured__heading-link" to={{ pathname: paths.game(slug), state: game }}>
        {name}
      </Link>
    );
  }

  renderButtons() {
    const { game, dispatch, currentUser, withStartedPlaying, removeFromFavourites, onStatusChange } = this.props;

    return (
      <GameCardButtons
        game={game}
        dispatch={dispatch}
        currentUser={currentUser}
        withStartedPlaying={withStartedPlaying}
        removeFromFavourites={removeFromFavourites}
        onStatusChange={onStatusChange}
        theme="dark"
      />
    );
  }

  render() {
    const { number } = this.props;

    return (
      <div className="game-card-featured" style={this.getCardStyle()}>
        {this.renderUsers()}
        <div className="game-card-featured__info">
          {this.renderMeta()}
          {this.renderTitle()}
          {this.renderButtons()}
        </div>
        {isFinite(number) && <div className="game-card-featured__number">{number + 1}</div>}
      </div>
    );
  }
}

export default GameCardFeatured;
