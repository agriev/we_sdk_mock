import React, { Component } from 'react';
import { Link } from 'app/components/link';
import { hot } from 'react-hot-loader/root';
import PropTypes from 'prop-types';
import cn from 'classnames';

import isFunction from 'lodash/isFunction';
import isArray from 'lodash/isArray';

import keysEqual from 'tools/keys-equal';
import resize from 'tools/img/resize';
import whenData from 'tools/logic/when-data';

import paths from 'config/paths';

import GameCardButtons from 'app/components/game-card-buttons';
import Rating from 'app/ui/rating';
import Platforms from 'app/ui/platforms';
import Chart from 'app/ui/chart';

import gameType from 'app/pages/game/game.types';
import currentUserType from 'app/components/current-user/current-user.types';

import './game-card-compact.styl';
import passDownProps from 'tools/pass-down-props';
import RenderMounted from 'app/render-props/render-mounted';

const formatDate = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const propTypes = {
  game: gameType.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,

  // Эти пропсы необходимо передать, если вы хотите иметь работающие кнопки карточки
  currentUser: currentUserType,
  dispatch: PropTypes.func,

  size: PropTypes.oneOf(['small', 'medium', 'large', 'largest']),
  alwaysShowBtns: PropTypes.bool,
  className: PropTypes.string,
  withStartedPlaying: PropTypes.bool,
  withDate: PropTypes.bool,
  withChart: PropTypes.bool,
  onClick: PropTypes.func,
  icon: PropTypes.node,
  removeFromFavourites: PropTypes.bool,
  showMedia: PropTypes.bool,
  ratingInTitle: PropTypes.bool,
  onStatusChange: PropTypes.func,
  customButtons: PropTypes.func,
  rightElement: PropTypes.node,
  buttonsProperties: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
};

const defaultProps = {
  className: undefined,
  currentUser: undefined,
  dispatch: undefined,
  size: 'large',
  withStartedPlaying: false,
  withDate: false,
  withChart: false,
  onClick: undefined,
  icon: null,
  removeFromFavourites: false,
  showMedia: true,
  ratingInTitle: false,
  onStatusChange: undefined,
  customButtons: undefined,
  alwaysShowBtns: false,
  rightElement: null,
  buttonsProperties: undefined,
};

@hot
class GameCardCompact extends Component {
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

  onClick = (event) => {
    const { onClick, game } = this.props;

    if (onClick) {
      onClick(event, game);
    }
  };

  renderMedia(visible) {
    const { game } = this.props;
    const style = { backgroundImage: `url('${resize(420, game.background_image)}')` };

    return <span role="button" tabIndex={0} className="game-card-compact__cover" style={visible ? style : undefined} />;
  }

  renderRating() {
    const { allRatings } = this.props;
    const { rating_top: id } = this.props.game;

    return whenData(id, () => (
      <Rating className="game-card-compact__rating" rating={id} allRatings={allRatings} kind="emoji" />
    ));
  }

  renderPlatforms() {
    const { size, game } = this.props;
    const { platforms, parent_platforms: parentPlatforms } = game;

    if (!isArray(platforms)) {
      return null;
    }

    return (
      <Platforms
        className="game-card-compact__platforms"
        platforms={platforms}
        parentPlatforms={parentPlatforms}
        size={size === 'small' ? 'small' : 'medium'}
        maxItems={3}
      />
    );
  }

  renderMeta() {
    return <div className="game-card-compact__meta">{this.renderPlatforms()}</div>;
  }

  renderTitle() {
    const { game, icon, onClick, ratingInTitle, allRatings } = this.props;
    const { name, slug } = game;
    const withoutLink = isFunction(onClick);
    const iconElement = !!icon && <span className="game-card-compact__icon">{icon}</span>;
    const className = cn('game-card-compact__heading', {
      'game-card-compact__heading_with-link': !withoutLink,
    });

    const ratingValue = game.community_rating || game.rating_top;
    const rating = ratingInTitle && !!ratingValue && (
      <Rating
        className="game-card-compact__heading__rating"
        rating={ratingValue}
        allRatings={allRatings}
        kind="emoji"
      />
    );

    if (withoutLink) {
      return (
        <div className={className} onClick={this.onClick} role="button" tabIndex="0">
          {iconElement}
          {name}
          {rating}
        </div>
      );
    }

    return (
      <Link className={className} to={{ pathname: paths.game(slug), state: game }}>
        {iconElement}
        {name}
        {rating}
      </Link>
    );
  }

  renderButtons() {
    const {
      game,
      dispatch,
      currentUser,
      withStartedPlaying,
      removeFromFavourites,
      onStatusChange,
      buttonsProperties,
    } = this.props;

    if (!currentUser || typeof dispatch !== 'function') return null;

    return (
      <GameCardButtons
        game={game}
        dispatch={dispatch}
        currentUser={currentUser}
        withStartedPlaying={withStartedPlaying}
        removeFromFavourites={removeFromFavourites}
        onStatusChange={onStatusChange}
        displayPlay={this.props.size === 'largest'}
        {...passDownProps(buttonsProperties, game)}
      />
    );
  }

  renderDate() {
    const {
      game: { released },
    } = this.props;

    return released && <span className="game-card-compact__date">{formatDate(released)}</span>;
  }

  renderChartIndex() {
    const {
      game: { chart, chartIndex },
    } = this.props;

    return <Chart className="game-card-compact__chart" chart={chart} index={chartIndex} />;
  }

  render() {
    const {
      size,
      withDate,
      withChart,
      className,
      onClick,
      game,
      customButtons,
      alwaysShowBtns,
      rightElement,
      showMedia,
    } = this.props;
    const { slug } = game;
    const MediaTag = isFunction(onClick) ? 'div' : Link;
    const cardClassName = cn('game-card-compact', `game-card-compact_${size}`, className, {
      'game-card-compact_always-show-btns': alwaysShowBtns,
    });

    return (
      <RenderMounted>
        {({ visible, onChildReference }) => (
          <div className={cardClassName} ref={(element) => onChildReference(element)}>
            {withDate && this.renderDate()}
            {withChart && this.renderChartIndex()}
            {showMedia && (
              <MediaTag
                to={{ pathname: paths.game(slug), state: game }}
                onClick={this.onClick}
                role="button"
                tabIndex={0}
                className="game-card-compact__media"
              >
                {this.renderMedia(visible)}
                {size !== 'small' && this.renderRating()}
              </MediaTag>
            )}
            <div className="game-card-compact__info">
              {this.renderMeta()}
              {this.renderTitle()}
              {customButtons ? customButtons(game) : this.renderButtons()}
            </div>
            {rightElement && <div className="game-card-compact__right">{rightElement}</div>}
          </div>
        )}
      </RenderMounted>
    );
  }
}

export default GameCardCompact;
