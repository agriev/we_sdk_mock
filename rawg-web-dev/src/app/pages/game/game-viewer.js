import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import MediaDetailViewer from 'app/ui/media-detail-viewer';

import gameType from 'app/pages/game/game.types';
import denormalizeGame from 'tools/redux/denormalize-game';

import { loadGameScreenshots, loadGameImgur, loadGameYoutube, loadGameTwitch } from './game.actions';
import './game-viewer.styl';

export const gameViewerPropTypes = {
  activeIndex: PropTypes.number,
  content: PropTypes.oneOf(['screenshots', 'movies', 'imgur', 'youtube', 'twitch']),
  onClose: PropTypes.func,
  game: gameType,
  dispatch: PropTypes.func.isRequired,
};

const defaultProps = {
  activeIndex: 0,
  content: 'screenshots',
  onClose: () => {},
  game: {},
};

@connect((state) => ({
  game: denormalizeGame(state),
}))
class GameViewer extends Component {
  static propTypes = gameViewerPropTypes;

  constructor(props) {
    super(props);

    this.state = {
      loading: false,
    };
  }

  getItems() {
    const { game, content } = this.props;

    return ['screenshots', 'movies'].includes(content)
      ? [
          ...game.movies.results.map((item) => ({ ...item, type: 'movies' })),
          ...game.screenshots.results.map((item) => ({ ...item, type: 'screenshots' })),
        ]
      : game[content].results.map((item) => ({ ...item, type: content }));
  }

  load = async () => {
    const {
      dispatch,
      content,
      game: { slug, screenshots, imgur, youtube, twitch },
    } = this.props;

    this.setState({ loading: true });

    switch (content) {
      case 'imgur':
        if (imgur.next) await dispatch(loadGameImgur(slug, imgur.next));
        break;
      case 'youtube':
        if (youtube.next) await dispatch(loadGameYoutube(slug, youtube.next));
        break;
      case 'twitch':
        if (twitch.next) await dispatch(loadGameTwitch(slug, twitch.next));
        break;
      case 'screenshots':
      case 'movies':
      default:
        if (screenshots.next) {
          await dispatch(loadGameScreenshots({ id: slug, page: screenshots.next }));
        }
        break;
    }

    this.setState({ loading: false });
  };

  render() {
    let { activeIndex = 0 } = this.props;
    const { content, onClose, game } = this.props;
    const { loading } = this.state;

    if (this.props.content === 'screenshots') {
      activeIndex += game.movies.results.length;
    }

    return (
      <MediaDetailViewer
        activeIndex={activeIndex}
        content={content}
        onClose={onClose}
        items={this.getItems()}
        loading={loading}
        displayNext={!!game[content].next}
        loadNext={this.load}
      />
    );
  }
}

GameViewer.defaultProps = defaultProps;

export default GameViewer;
