import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import prepare from 'tools/hocs/prepare';
import { prepareTwitch } from 'app/pages/game/game.prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import getPagesCount from 'tools/get-pages-count';

import SeoTexts from 'app/ui/seo-texts';

import { appLocaleType } from 'app/pages/app/app.types';
import gameType from 'app/pages/game/game.types';

import twitchLogo from 'assets/icons/twitch-logo.png';

import ListLoader from 'app/ui/list-loader';
import VideoCard from 'app/ui/video-card';
import { loadGameTwitch, PAGE_SIZE } from 'app/pages/game/game.actions';
import GameSubpage from 'app/components/game-subpage';
import GameViewer from 'app/pages/game/game-viewer';
import './game-twitch.styl';

@prepare(prepareTwitch, { updateParam: 'id' })
@connect((state) => ({
  game: denormalizeGame(state),
  locale: state.app.locale,
}))
export default class GameTwitch extends Component {
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
      this.openViewer('twitch', +activeIndex);
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
      twitch: { next },
    } = game;

    return dispatch(loadGameTwitch(slug, next));
  };

  render() {
    const { game, locale } = this.props;
    if (!game.id) return null;

    const { twitch } = game;
    const { results, loading, next, count } = twitch;
    const { viewerVisible, viewerContent, viewerIndex } = this.state;

    return (
      <GameSubpage section="twitch" logo={<img className="game-subpage__twitch-icon" src={twitchLogo} alt="" />}>
        <SeoTexts
          locale={locale}
          onLocales="ru"
          values={{ name: game.name }}
          strs={['game.twitch_seo_li_1', 'game.twitch_seo_li_2']}
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
                className="game-subpage__twitch-item"
                onClick={() => this.openViewer('twitch', index)}
                video={video}
                kind="inline"
                size="medium"
                source="twitch"
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
