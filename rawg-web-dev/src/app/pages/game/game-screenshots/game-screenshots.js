/* eslint-disable jsx-a11y/no-noninteractive-element-to-interactive-role */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import memoize from 'fast-memoize';

import 'video-react/dist/video-react.css';
import './game-screenshots.styl';

import denormalizeGame from 'tools/redux/denormalize-game';
import resize from 'tools/img/resize';
import prepare from 'tools/hocs/prepare';
import { prepareScreenshots } from 'app/pages/game/game.prepare';

import ListLoader from 'app/ui/list-loader';
import VideoCard from 'app/ui/video-card';
import { loadGameScreenshots, PAGE_SIZE } from 'app/pages/game/game.actions';
import GameSubpage from 'app/components/game-subpage';
import GameViewer from 'app/pages/game/game-viewer';
import ResponsiveImage from 'app/ui/responsive-image';

import gameType from 'app/pages/game/game.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';
import getPagesCount from 'tools/get-pages-count';

import SeoTexts from 'app/ui/seo-texts';

const screenshotTitle = (intl, name, id) => intl.formatMessage({ id: 'game.screenshot_title' }, { name, id });

@hot
@prepare(prepareScreenshots, { updateParam: 'id' })
@connect((state) => ({
  game: denormalizeGame(state),
  locale: state.app.locale,
}))
@injectIntl
export default class GameScreenshots extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    game: gameType.isRequired,
    intl: intlShape.isRequired,
    location: locationShape.isRequired,
    locale: PropTypes.string.isRequired,
  };

  constructor(props, context) {
    super(props, context);

    this.openViewer = memoize(this.openViewer);

    this.state = {
      viewerVisible: false,
      viewerContent: undefined,
      viewerIndex: undefined,
    };
  }

  openViewer = (content, index) => (event) => {
    event.preventDefault();

    this.setState({
      viewerVisible: true,
      viewerContent: content,
      viewerIndex: index,
    });
  };

  closeViewer = () => {
    this.setState({
      viewerVisible: false,
    });
  };

  load = () => {
    const { dispatch, game } = this.props;
    const {
      slug,
      screenshots: { next },
    } = game;

    return dispatch(loadGameScreenshots({ id: slug, page: next }));
  };

  render() {
    const { game, intl, location, locale } = this.props;

    if (!game.id) return null;

    const { viewerVisible, viewerContent, viewerIndex } = this.state;
    const { screenshots, movies, name } = game;
    const { results, loading, next, count } = screenshots;
    const { page } = location.query;
    const showVideos = !page || page < 2;

    return (
      <GameSubpage section="screenshots">
        <SeoTexts
          locale={locale}
          onLocales="ru"
          values={{ name: game.name }}
          strs={['game.screenshots_seo_li_1', 'game.screenshots_seo_li_2', 'game.screenshots_seo_li_3']}
        />
        <ListLoader
          load={this.load}
          count={count}
          next={next}
          loading={loading}
          pages={getPagesCount(count, PAGE_SIZE)}
          isOnScroll
        >
          <div className="game-subpage__list">
            {showVideos &&
              movies.results.map((movie, index) => (
                <VideoCard
                  className="game-subpage__block-item game-subpage__screenshots-item"
                  onClick={this.openViewer('movies', index)}
                  video={movie}
                  source="movie"
                  kind="block"
                  size="medium"
                  key={movie.id}
                />
              ))}
            {results.map((scr, index) => {
              const { id, image } = scr;
              const title = screenshotTitle(intl, name, id);

              return (
                <ResponsiveImage
                  key={image}
                  className="game-subpage__block-item  game-subpage__screenshots-item"
                  image={{
                    simple: resize(200, image),
                    retina: resize(420, image),
                  }}
                  title={title}
                  alt={`${title} - RAWG`}
                  onClick={this.openViewer('screenshots', index)}
                  role="button"
                  tabIndex={0}
                />
              );
            })}
          </div>
        </ListLoader>
        {viewerVisible && <GameViewer content={viewerContent} activeIndex={viewerIndex} onClose={this.closeViewer} />}
      </GameSubpage>
    );
  }
}
