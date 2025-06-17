import React from 'react';
import PropTypes from 'prop-types';
import { injectIntl } from 'react-intl';
import { pure, compose } from 'recompose';
import { Link } from 'app/components/link';
import SVGInline from 'react-svg-inline';
import memoizeOne from 'memoize-one';
import cn from 'classnames';

import last from 'lodash/last';
import head from 'lodash/head';
import slice from 'lodash/slice';
import get from 'lodash/get';

import ResponsiveImage from 'app/ui/responsive-image';
import GameCardVideo from 'app/ui/game-card-video';

import dotsIcon from 'assets/icons/dots.svg';

import {
  slug as slugType,
  screenshots as screenshotsType,
  movies as moviesType,
  clipType,
} from 'app/pages/game/game.types';

import resize from 'tools/img/resize';

import paths from 'config/paths';
import RenderMounted from 'app/render-props/render-mounted';
import len from 'tools/array/len';
import intlShape from 'tools/prop-types/intl-shape';

const hoc = compose(
  pure,
  injectIntl,
);

const gameScreenshotsBlockPropertyTypes = {
  slug: slugType.isRequired,
  screenshots: screenshotsType, // eslint-disable-line react/no-unused-prop-types
  movies: moviesType, // eslint-disable-line react/no-unused-prop-types
  clip: clipType,
  name: PropTypes.string,
  openViewer: PropTypes.func.isRequired,
  intl: intlShape.isRequired,
};

const gameScreenshotsBlockDefaultProperties = {
  name: '',
  movies: undefined,
  screenshots: undefined,
  clip: undefined,
};

class GameScreenshotsBlockComponent extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.videoPlayerRef = React.createRef();

    this.state = {
      showVideo: false,
    };
  }

  async componentDidMount() {
    const [, videoReact] = await Promise.all([
      import('video-react/dist/video-react.css'),
      import('video-react/dist/video-react.cjs'),
    ]);

    this.Player = videoReact.Player;
    this.setState({ showVideo: true });
  }

  onPlayerClick = (event) => {
    if (this.videoPlayerRef.current) {
      const state = this.videoPlayerRef.current.getState();

      if (!state.player.isFullscreen && state.player.paused) {
        event.stopPropagation();
        this.videoPlayerRef.current.play();
        this.videoPlayerRef.current.toggleFullscreen();
      }
    }
  };

  getVideos = () => {
    if (!this.state.showVideo) {
      return [];
    }

    const { clip } = this.props;
    const movies = get(this.props, 'movies.results', []);
    const results = [];

    if (clip) {
      results.push({
        type: 'video',
        id: `movie-${clip.preview}`,
        preview: clip.preview,
        url: clip.clips.full,
        videoId: clip.video,
        index: 0,
      });
    }

    if (len(movies) > 0) {
      results.push({
        type: 'video',
        id: `movie-${movies[0].preview}`,
        preview: movies[0].preview,
        url: movies[0].data.max,
        index: clip ? 1 : 0,
      });
    }

    return results;
  };

  getVideosCount = () => {
    const movies = get(this.props, 'movies.results', []);

    return len(movies);
  };

  getMediaElements = () => {
    const videos = this.getVideos();
    const screenshots = get(this.props, 'screenshots.results', []);
    const results = [].concat(videos);

    return results.concat(
      screenshots.map((screenshot, index) => ({
        type: 'image',
        id: screenshot.id,
        url: screenshot.image,
        index,
      })),
    );
  };

  renderScreenshot = ({ index, screenshot, className, visible, isLarge = false } = {}) => {
    const { openViewer, name, intl } = this.props;
    const { id, url } = screenshot;
    const title = intl.formatMessage({ id: 'game.screenshot_title' }, { name, id });
    const resizeSimple = isLarge ? resize(420) : resize(200);
    const resizeRetina = isLarge ? resize(640) : resize(420);

    return (
      <div key={url} className={className} onClick={openViewer('screenshots', index)} role="button" tabIndex={0}>
        <ResponsiveImage
          className="game__screenshot-image"
          image={{
            simple: resizeSimple(url),
            retina: resizeRetina(url),
          }}
          title={title}
          alt={`${title} - RAWG`}
          visible={visible}
        />
      </div>
    );
  };

  renderMediaElement = (visible, element, index) => {
    const { Player } = this;

    if (element.type === 'video') {
      return (
        <div
          key={element.id}
          className={cn('game__movie', { 'game__screenshots-item': index > 0 })}
          onClickCapture={index === 1 ? this.onPlayerClick : undefined}
          role={index === 1 ? 'button' : undefined}
          tabIndex={index === 1 ? 0 : undefined}
        >
          {index === 0 && (
            <GameCardVideo
              playing
              url={element.url}
              videoId={element.videoId}
              preview={element.preview}
              doNotStopOnStartAnother
            />
          )}
          {index > 0 && (
            <Player
              poster={element.preview}
              aspectRatio="16:9"
              src={element.url}
              ref={this.videoPlayerRef}
              playsInline
              muted
            />
          )}
        </div>
      );
    }

    return this.renderScreenshot({
      screenshot: element,
      className: index === 0 ? 'game__screenshot' : 'game__screenshots-item',
      isLarge: index === 0,
      index: element.index,
      visible,
    });
  };

  render() {
    const { slug, intl } = this.props;

    const backgroundUrl = memoizeOne((url, visible) =>
      url && visible ? { backgroundImage: `url("${resize(640, url)}")` } : undefined,
    );

    const elements = this.getMediaElements();
    const firstElement = head(elements);
    const lastElements = slice(elements, 1, 4);

    if (len(elements) === 0) {
      return null;
    }

    return (
      <RenderMounted>
        {({ visible, onChildReference }) => (
          <div ref={(element) => onChildReference(element)} className="game__screenshots">
            <div className="game__screenshots-inner">
              {firstElement && this.renderMediaElement(visible, firstElement, 0)}
              {len(lastElements) > 0 && (
                <div className="game__screenshots-list">
                  {lastElements.map((element, index) => this.renderMediaElement(visible, element, index + 1))}
                  <Link className="game__screenshots-item game__screenshots-all" to={paths.gameScreenshots(slug)}>
                    <div
                      className="game__screenshots-all__decor"
                      style={backgroundUrl(last(lastElements).url, visible)}
                    />
                    <SVGInline className="game__screenshots-icon" svg={dotsIcon} />
                    {intl.formatMessage({ id: 'game.view_all' })}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </RenderMounted>
    );
  }
}

GameScreenshotsBlockComponent.propTypes = gameScreenshotsBlockPropertyTypes;
GameScreenshotsBlockComponent.defaultProps = gameScreenshotsBlockDefaultProperties;

const GameScreenshotsBlock = hoc(GameScreenshotsBlockComponent);

export default GameScreenshotsBlock;
