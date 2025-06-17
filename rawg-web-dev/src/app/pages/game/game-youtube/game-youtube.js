import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import prepare from 'tools/hocs/prepare';
import { prepareYoutube } from 'app/pages/game/game.prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import getPagesCount from 'tools/get-pages-count';

import youtubeLogo from 'assets/icons/youtube-logo.png';

import { appLocaleType } from 'app/pages/app/app.types';
import gameType from 'app/pages/game/game.types';

import ListLoader from 'app/ui/list-loader';
import VideoCard from 'app/ui/video-card';
import { loadGameYoutube, PAGE_SIZE } from 'app/pages/game/game.actions';
import GameSubpage from 'app/components/game-subpage';
import GameViewer from 'app/pages/game/game-viewer';

import SeoTexts from 'app/ui/seo-texts';

import './game-youtube.styl';

@prepare(prepareYoutube, { updateParam: 'id' })
@connect((state) => ({
  game: denormalizeGame(state),
  locale: state.app.locale,
}))
export default class GameYoutube extends Component {
  static propTypes = {
    params: PropTypes.shape().isRequired,
    game: gameType.isRequired,
    dispatch: PropTypes.func.isRequired,
    locale: appLocaleType.isRequired,
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      viewerVisible: false,
    };
  }

  componentDidMount() {
    const {
      params: { activeIndex },
    } = this.props;

    if (+activeIndex >= 0) {
      this.openViewer('youtube', +activeIndex);
    }
  }

  openViewer = (content, index) => {
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
      youtube: { next },
    } = game;

    return dispatch(loadGameYoutube(slug, next));
  };

  render() {
    const { game, locale } = this.props;
    if (!game.id) return null;

    const { youtube } = game;
    const { results, loading, next, count } = youtube;
    const { viewerVisible, viewerContent, viewerIndex } = this.state;

    return (
      <GameSubpage section="youtube" logo={<img className="game-subpage__youtube-icon" src={youtubeLogo} alt="" />}>
        <SeoTexts
          locale={locale}
          onLocales="ru"
          values={{ name: game.name }}
          strs={['game.youtube_seo_li_1', 'game.youtube_seo_li_2', 'game.youtube_seo_li_3']}
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
            {results.map((video, index) => (
              <VideoCard
                className="game-subpage__youtube-item"
                onClick={() => this.openViewer('youtube', index)}
                video={video}
                kind="inline"
                size="medium"
                source="youtube"
                truncateChannelTitleOnMobile
                key={video.id}
              />
            ))}
          </div>
        </ListLoader>
        {viewerVisible && <GameViewer content={viewerContent} activeIndex={viewerIndex} onClose={this.closeViewer} />}
      </GameSubpage>
    );
  }
}
