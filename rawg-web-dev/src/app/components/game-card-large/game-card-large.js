import React from 'react';
import { hot } from 'react-hot-loader/root';
import PropTypes from 'prop-types';
import cn from 'classnames';
import memoizeOne from 'memoize-one';
import EventEmitter from 'events';
import { Element } from 'react-scroll';
import './game-card-large.styl';

import isArray from 'lodash/isArray';
import defaultTo from 'lodash/defaultTo';

import keysEqual from 'tools/keys-equal';
import resize from 'tools/img/resize';

import appHelper from 'app/pages/app/app.helper';

import GameCardCompact from 'app/components/game-card-compact';
import GameCardVideo from 'app/ui/game-card-video';
import GameCardAbout from 'app/ui/game-card-about';
import GameCardComments from 'app/components/game-card-comments';
import GameCardAboutText from 'app/ui/game-card-about-text';
import Platforms from 'app/ui/platforms';
import ScreenshotsGallery from 'app/ui/screenshots-gallery';
import RenderMounted from 'app/render-props/render-mounted';
import ShowMoreButton from 'app/ui/show-more-button';

import gameType from 'app/pages/game/game.types';
import currentUserType from 'app/components/current-user/current-user.types';
import { appSizeType } from 'app/pages/app/app.types';

const ee = new EventEmitter();

ee.setMaxListeners(1000);

const propTypes = {
  appSize: appSizeType.isRequired,
  currentUser: currentUserType,
  dispatch: PropTypes.func,
  game: gameType.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,

  playVideoOnHitScreen: PropTypes.bool,
  showComments: PropTypes.bool,
  showAboutText: PropTypes.bool,
  showMedia: PropTypes.bool,
  aboutText: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  width: PropTypes.string,
  className: PropTypes.string,
  showMoreButton: PropTypes.bool,
  showReleaseDate: PropTypes.bool,
  buttonsProperties: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  additionalButtons: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
      children: PropTypes.node.isRequired,
    }),
  ),
};

const defaultProps = {
  currentUser: undefined,
  dispatch: undefined,
  width: undefined,
  className: undefined,
  showComments: false,
  showAboutText: false,
  aboutText: undefined,
  playVideoOnHitScreen: false,
  showMoreButton: false,
  showReleaseDate: false,
  showMedia: true,
  buttonsProperties: undefined,
  additionalButtons: undefined,
};

@hot
class GameCardLarge extends React.Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.state = {
      playing: false,
    };

    this.videoRef = React.createRef();
    this.mounted = true;

    this.getCardStyle = memoizeOne(this.getCardStyle);
  }

  componentDidMount() {
    ee.on('opened', this.onOpenCard);
  }

  shouldComponentUpdate(nextProperties, nextState) {
    const propsIsDifferent = !keysEqual(this.props, nextProperties, [
      'currentUser',
      'game.user_game',
      'game.user_review',
      'game.comments.results.length',
      'width',
      'appSize',
    ]);

    const stateIsDifferent = !keysEqual(this.state, nextState, ['opened', 'playing']);

    return propsIsDifferent || stateIsDifferent;
  }

  componentWillUnmount() {
    this.mounted = false;

    if (typeof ee.off === 'function') {
      ee.off('opened', this.onOpenCard);
    }
  }

  getCardStyle = (width) => {
    if (width) {
      return { width };
    }

    return null;
  };

  onOpenCard = (gameSlug) => {
    if (this.props.game.slug !== gameSlug) {
      this.close();
    }
  };

  onClick = () => {
    if (this.videoRef.current && !this.state.playing) {
      this.setState({ playing: true });
      this.videoRef.current.play();
    }
  };

  onMouseEnter = (event) => {
    const { appSize } = this.props;

    if (appHelper.isDesktopSize({ size: appSize })) {
      this.open(event);
    }

    if (!this.props.playVideoOnHitScreen) {
      this.setState({ playing: true });
    }
  };

  onMouseLeave = (event) => {
    this.close(event);

    if (!this.props.playVideoOnHitScreen) {
      this.setState({ playing: false });
    }
  };

  open = (event) => {
    const { appSize } = this.props;
    if (event && appHelper.isPhoneSize({ size: appSize })) {
      event.stopPropagation();
    }

    ee.emit('opened', this.props.game.slug);

    this.setState({ opened: true });
  };

  close = (event) => {
    if (event) {
      event.stopPropagation();
    }

    if (!this.state.opened) {
      return;
    }

    this.setState({ opened: false });
  };

  toggleOpen = (event) => {
    if (this.state.opened) {
      this.close(event);
    } else {
      this.open(event);
    }
  };

  onShow = () => {
    if (this.mounted) {
      this.setState({ playing: true });
    }
  };

  onHide = () => {
    if (this.mounted) {
      this.setState({ playing: false });
    }
  };

  renderMedia(visible) {
    const { game, appSize, showMedia } = this.props;
    const { playing, opened } = this.state;
    const title = `${game.name} screenshot`;
    const isPhoneSize = appHelper.isPhoneSize({ size: appSize });
    let media = game.background_image;

    if (!showMedia) {
      return null;
    }

    if (game.clip) {
      return (
        <div className="game-card-large__media-wrapper">
          <GameCardVideo
            playing={playing}
            url={game.clip.clip}
            videoId={game.clip.video}
            preview={visible ? game.background_image || game.clip.preview : undefined}
            ref={this.videoRef}
            isPhoneSize={isPhoneSize}
            visible={visible}
            gameUrl={`/games/${game.slug}`}
            isOnline={game.can_play || !!game.iframe_url}
          />
        </div>
      );
    }

    if (isArray(game.short_screenshots) && game.short_screenshots.length > 0) {
      if (game.short_screenshots.length > 1 && (opened || isPhoneSize)) {
        return (
          <ScreenshotsGallery
            screenshots={game.short_screenshots}
            title={title}
            isPhoneSize={isPhoneSize}
            visible={visible}
            url={`/games/${game.slug}`}
          />
        );
      }

      media = game.short_screenshots[0].image;
    }

    if (media) {
      return (
        <div className="game-card-large__media-wrapper">
          <img src={visible ? resize(640, media) : undefined} alt={title} title={title} />
        </div>
      );
    }

    return <div className="game-card-large__media-empty" />;
  }

  renderAbout() {
    const { game, appSize, allRatings, showReleaseDate } = this.props;

    return (
      <GameCardAbout
        size="large"
        kind="queue"
        appSize={appSize}
        game={game}
        allRatings={allRatings}
        showReleaseDate={showReleaseDate}
        showMetacritic
        opened
      />
    );
  }

  renderComments() {
    const { game, dispatch } = this.props;
    const { comments } = game;

    return <GameCardComments gameSlug={game.slug} comments={comments} dispatch={dispatch} />;
  }

  renderAdditionalButton = ({ key, onClick, to, children }) => {
    const { game } = this.props;

    const clickHandler = () => {
      onClick(game);
    };

    return (
      <ShowMoreButton key={key} onClick={clickHandler} path={to} className="show-more-button_game-card-medium">
        {children}
      </ShowMoreButton>
    );
  };

  renderMain() {
    const {
      game,
      currentUser,
      dispatch,
      showMoreButton,
      additionalButtons,
      buttonsProperties,
      allRatings,
    } = this.props;

    return (
      <div className="game-card-large__main">
        <GameCardCompact
          currentUser={currentUser}
          dispatch={dispatch}
          game={game}
          allRatings={allRatings}
          size="largest"
          rightElement={
            <>
              {showMoreButton && <ShowMoreButton game={game} />}
              {additionalButtons && additionalButtons.map(this.renderAdditionalButton)}
            </>
          }
          buttonsProperties={buttonsProperties}
          showMedia={false}
          ratingInTitle
        />
      </div>
    );
  }

  renderPlatforms() {
    const { platforms, parent_platforms: parentPlatforms } = this.props.game;

    if (!isArray(platforms)) {
      return null;
    }

    return (
      <>
        <Platforms
          className="game-card-large__platforms"
          platforms={platforms}
          parentPlatforms={parentPlatforms}
          size="medium"
          maxItems={5}
        />
      </>
    );
  }

  renderAboutText() {
    const { game, aboutText } = this.props;
    const { description } = game;

    return <GameCardAboutText description={defaultTo(aboutText, description)} />;
  }

  renderContent({ onChildReference1, onChildReference2, visible }) {
    const { width, className, showComments, showAboutText, game } = this.props;
    const { comments } = game;

    return (
      <div
        className={cn('game-card-large', className, {
          'game-card-large_online': game.can_play,
        })}
        style={this.getCardStyle(width)}
        onClick={this.onClick}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        ref={(element) => {
          onChildReference1(element);
          onChildReference2(element);
        }}
        role="button"
        tabIndex={0}
      >
        <Element name={`game-card-large-${game.slug}`} />
        <div className="game-card-large__media">{this.renderMedia(visible)}</div>
        {this.renderMain()}
        <div className="game-card-large__info">{this.renderAbout()}</div>
        {showAboutText && <div className="game-card-large__about-text">{this.renderAboutText()}</div>}
        {showComments && comments && <div className="game-card-large__comments">{this.renderComments()}</div>}
      </div>
    );
  }

  render() {
    const { playVideoOnHitScreen } = this.props;

    return (
      <RenderMounted
        rootMargin="-100px 0px -200px 0px"
        onShow={playVideoOnHitScreen ? this.onShow : undefined}
        onHide={playVideoOnHitScreen ? this.onHide : undefined}
      >
        {({ onChildReference: onChildReference1 }) => (
          <RenderMounted>
            {({ onChildReference: onChildReference2, visible }) =>
              this.renderContent({ onChildReference1, onChildReference2, visible })
            }
          </RenderMounted>
        )}
      </RenderMounted>
    );
  }
}

export default GameCardLarge;
