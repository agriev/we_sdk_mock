import React, { Component } from 'react';
import { Link } from 'app/components/link';
import { hot } from 'react-hot-loader/root';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';
import cn from 'classnames';
import memoizeOne from 'memoize-one';
import EventEmitter from 'events';

import './game-card-medium.styl';

import isArray from 'lodash/isArray';
import defaultTo from 'lodash/defaultTo';
import isFinite from 'lodash/isFinite';

import paths from 'config/paths';
import keysEqual from 'tools/keys-equal';
import resize from 'tools/img/resize';
import appHelper from 'app/pages/app/app.helper';

import intlShape from 'tools/prop-types/intl-shape';

import GameCardButtons from 'app/components/game-card-buttons';
import GameCardVideo from 'app/ui/game-card-video';
import GameCardAbout from 'app/ui/game-card-about';
import GameCardComments from 'app/components/game-card-comments';
import GameCardAboutText from 'app/ui/game-card-about-text';
import Heading from 'app/ui/heading';
import Platforms from 'app/ui/platforms';
import ShowMoreButton from 'app/ui/show-more-button';
import ScreenshotsGallery from 'app/ui/screenshots-gallery';
import Rating from 'app/ui/rating';

import gameType from 'app/pages/game/game.types';
import currentUserType from 'app/components/current-user/current-user.types';
import { appSizeType } from 'app/pages/app/app.types';
import passDownProps from 'tools/pass-down-props';
import EmbedPreviews from 'app/ui/embed-previews';
import MetascoreLabel from 'app/ui/metascore-label';

import RenderMounted from 'app/render-props/render-mounted';

const ee = new EventEmitter();

ee.setMaxListeners(1000);

const propTypes = {
  appSize: appSizeType.isRequired,
  currentUser: currentUserType,
  dispatch: PropTypes.func,
  game: gameType.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  intl: intlShape.isRequired,

  showComments: PropTypes.bool,
  showAboutText: PropTypes.bool,
  showAboutTextAbove: PropTypes.bool,
  aboutText: PropTypes.oneOfType([PropTypes.string, PropTypes.node, PropTypes.object]),
  gameOwner: PropTypes.shape(),
  width: PropTypes.string,
  short: PropTypes.bool,
  className: PropTypes.string,
  removeFromFavourites: PropTypes.bool,
  gameIndex: PropTypes.number,
  onStatusChange: PropTypes.func,
  customButtons: PropTypes.func,
  additionalAboutItem: PropTypes.shape({
    title: PropTypes.node,
    getValue: PropTypes.func,
  }),
  showMoreButton: PropTypes.bool,
  buttonsProperties: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  showAddedBy: PropTypes.bool,
  showReleaseDate: PropTypes.bool,
  showEmbeds: PropTypes.bool,
  showMedia: PropTypes.bool,
  embedData: PropTypes.shape({
    text_attachments: PropTypes.number,
    text_previews: PropTypes.arrayOf(PropTypes.string),
  }),
  onEmbedClick: PropTypes.func,
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
  short: false,
  removeFromFavourites: false,
  onStatusChange: undefined,
  gameIndex: undefined,
  customButtons: undefined,
  gameOwner: undefined,
  additionalAboutItem: undefined,
  showComments: false,
  showAboutText: false,
  showAboutTextAbove: false,
  aboutText: undefined,
  showMoreButton: false,
  buttonsProperties: undefined,
  showAddedBy: false,
  showReleaseDate: false,
  showEmbeds: false,
  showMedia: true,
  embedData: undefined,
  onEmbedClick: undefined,
  additionalButtons: undefined,
};

@hot
@injectIntl
class GameCardMedium extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.state = {
      playing: false,
      opened: false,
    };

    this.videoRef = React.createRef();

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
      'gameOwner',
      'game.comments.results.length',
      'width',
      'appSize',
      'aboutText',
    ]);

    const stateIsDifferent = !keysEqual(this.state, nextState, ['opened', 'playing']);

    return propsIsDifferent || stateIsDifferent;
  }

  componentWillUnmount() {
    if (typeof ee.off === 'function') {
      ee.off('opened', this.onOpenCard);
    }
  }

  ref = (onChildReference) => (element) => {
    this.currentRef = element;
    onChildReference(element);
  };

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
    const { appSize } = this.props;

    if (appHelper.isDesktopSize(appSize) && this.videoRef.current && !this.state.playing) {
      this.setState({ playing: true });
      this.videoRef.current.play();
    }
  };

  onMouseEnter = (event) => {
    const { appSize } = this.props;

    if (appHelper.isDesktopSize(appSize)) {
      this.open(event);
      this.setState({ playing: true });
    }
  };

  onMouseLeave = (event) => {
    this.close(event);
    this.setState({ playing: false });
  };

  open = (event) => {
    const { appSize } = this.props;
    if (event && appHelper.isPhoneSize(appSize)) {
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
        <div className="game-card-medium__media-wrapper">
          <GameCardVideo
            playing={playing}
            url={game.clip.clip}
            videoId={game.clip.video}
            preview={game.background_image || game.clip.preview}
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
        <Link to={`/games/${game.slug}`}>
          <div className="game-card-medium__media-wrapper">
            <img src={visible ? resize(640, media) : undefined} alt={title} title={title} />
          </div>
        </Link>
      );
    }

    return (
      <Link to={`/games/${game.slug}`}>
        <div className="game-card-medium__media-empty" />
      </Link>
    );
  }

  renderPlatforms() {
    // eslint-disable-next-line camelcase
    const { can_play, iframe_url, platforms, parent_platforms: parentPlatforms } = this.props.game;

    // eslint-disable-next-line camelcase
    if (!this.shouldRenderPlatforms()) {
      return null;
    }

    return (
      <>
        <Platforms
          className="game-card-medium__platforms"
          platforms={platforms}
          parentPlatforms={parentPlatforms}
          size="medium"
          maxItems={5}
        />
      </>
    );
  }

  renderMetacritic() {
    const { game } = this.props;

    if (this.shouldRenderMetacritic()) {
      return <MetascoreLabel rating={game.metacritic} />;
    }

    return null;
  }

  shouldRenderPlatforms() {
    // eslint-disable-next-line camelcase
    const { can_play, iframe_url, platforms } = this.props.game;

    // eslint-disable-next-line camelcase
    if (!isArray(platforms) || (can_play || !!iframe_url)) {
      return false;
    }

    return true;
  }

  shouldRenderMetacritic() {
    return isFinite(this.props.game.metacritic);
  }

  renderMeta() {
    if (this.shouldRenderMetacritic() || this.shouldRenderPlatforms()) {
      return (
        <div className="game-card-medium__meta">
          {this.renderPlatforms()}
          {this.renderMetacritic()}
        </div>
      );
    }

    return null;
  }

  renderTitle() {
    /* eslint-disable react/no-array-index-key */

    const { game, appSize, allRatings } = this.props;
    const { name, slug } = game;

    if (!name) {
      return null;
    }

    const ratingValue = game.community_rating || game.rating_top;
    const rating = !!ratingValue && (
      <Rating className="game-card-medium__info__rating" rating={ratingValue} allRatings={allRatings} kind="emoji" />
    );

    return (
      <Heading rank={appHelper.isDesktopSize(appSize) ? 4 : 2} disabled>
        <Link className="game-card-medium__info__name" to={{ pathname: paths.game(slug), state: game }}>
          {name}
          {rating}
        </Link>

        {(game.can_play || !!game.iframe_url) && game.description_short && (
          <div className="game-card-medium__info__description">{game.description_short}</div>
        )}
      </Heading>
    );
  }

  renderButtons() {
    const {
      game,
      dispatch,
      currentUser,
      removeFromFavourites,
      gameIndex,
      onStatusChange,
      buttonsProperties,
    } = this.props;

    if (!dispatch || !currentUser) return null;

    return (
      <GameCardButtons
        game={game}
        dispatch={dispatch}
        currentUser={currentUser}
        removeFromFavourites={removeFromFavourites}
        onStatusChange={onStatusChange}
        gameIndex={gameIndex}
        displayPlay
        {...passDownProps(buttonsProperties, game)}
      />
    );
  }

  renderAbout() {
    const { opened } = this.state;
    const {
      game,
      appSize,
      gameOwner,
      additionalAboutItem,
      showAddedBy,
      showReleaseDate,
      allRatings,
      showMoreButton,
      showAboutText,
      additionalButtons,
    } = this.props;

    if (appHelper.isPhoneSize(appSize)) {
      return null;
    }

    const showMoreClassName = showAboutText ? 'game-card-medium__show-more-button_with-about-text' : undefined;

    return (
      <div className="game-card-medium__data">
        <div className="game-card-medium__data-body">
          <GameCardAbout
            appSize={appSize}
            allRatings={allRatings}
            game={game}
            opened={opened}
            toggleOpen={this.toggleOpen}
            gameOwner={gameOwner}
            showAddedBy={showAddedBy}
            showReleaseDate={showReleaseDate}
            additionalAboutItem={additionalAboutItem}
          />

          {opened && showMoreButton && <ShowMoreButton className={showMoreClassName} game={game} />}
          {opened && additionalButtons && additionalButtons.map(this.renderAdditionalButton)}
        </div>
      </div>
    );
  }

  renderAboutText() {
    const { game, aboutText } = this.props;
    const { description } = game;

    return <GameCardAboutText description={defaultTo(aboutText, description)} />;
  }

  renderEmbeds(visible) {
    const { appSize, embedData, onEmbedClick } = this.props;

    return (
      <EmbedPreviews
        onClick={onEmbedClick}
        className="game-card-medium__info__embeds"
        appSize={appSize}
        embedData={embedData}
        visible={visible}
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

  render() {
    const {
      width,
      short,
      className,
      game,
      customButtons,
      showComments,
      showAboutText,
      showAboutTextAbove,
      showEmbeds,
    } = this.props;

    const { opened } = this.state;

    return (
      <RenderMounted>
        {({ visible, onChildReference }) => (
          <div
            className={cn('game-card-medium', className, {
              'game-card-medium_opened': opened,
              'game-card-medium_online': game.can_play,
            })}
            ref={this.ref(onChildReference)}
            style={this.getCardStyle(width)}
          >
            <div
              className="game-card-medium__wrapper"
              onClick={this.onClick}
              onMouseEnter={this.onMouseEnter}
              onMouseLeave={this.onMouseLeave}
              role="button"
              tabIndex={0}
            >
              <div className="game-card-medium__media">{this.renderMedia(visible)}</div>

              <div className="game-card-medium__body">
                {!short && this.renderAbout()}
                <div className="game-card-medium__info">
                  {this.renderMeta()}
                  {this.renderTitle()}
                  <div className="game-card-medium__info-footer">
                    {customButtons ? customButtons(game) : this.renderButtons()}
                    {showAboutText && showAboutTextAbove && this.renderAboutText()}
                    {showEmbeds && this.renderEmbeds(visible)}
                    {showAboutText && !showAboutTextAbove && this.renderAboutText()}
                  </div>
                </div>
                {showComments && <div className="game-card-medium__comments">{this.renderComments()}</div>}
              </div>
            </div>
          </div>
        )}
      </RenderMounted>
    );
  }
}

export default GameCardMedium;
