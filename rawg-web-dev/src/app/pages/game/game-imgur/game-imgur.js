import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import getPagesCount from 'tools/get-pages-count';
import { prepareImgur } from 'app/pages/game/game.prepare';

import './game-imgur.styl';

import imgurLogo from 'assets/icons/imgur-logo.png';

import ListLoader from 'app/ui/list-loader';
import { loadGameImgur, PAGE_SIZE } from 'app/pages/game/game.actions';
import GameSubpage from 'app/components/game-subpage';
import GameViewer from 'app/pages/game/game-viewer';
import gameType from 'app/pages/game/game.types';
import SeoTexts from 'app/ui/seo-texts/seo-texts';
import { appLocaleType } from 'app/pages/app/app.types';

@prepare(prepareImgur, { updateParam: 'id' })
@connect((state) => ({
  game: denormalizeGame(state),
  locale: state.app.locale,
}))
export default class GameImgur extends Component {
  static propTypes = {
    params: PropTypes.shape().isRequired,
    dispatch: PropTypes.func.isRequired,
    game: gameType.isRequired,
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
      this.openViewer('imgur', +activeIndex);
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
      imgur: { next },
    } = game;

    return dispatch(loadGameImgur(slug, next));
  };

  render() {
    const { game, locale } = this.props;

    if (!game.id) return null;

    const { imgur } = game;
    const { results, loading, next, count } = imgur;
    const { viewerVisible, viewerContent, viewerIndex } = this.state;

    return (
      <GameSubpage section="imgur" logo={<img alt="" className="game-subpage__imgur-icon" src={imgurLogo} />}>
        <SeoTexts
          locale={locale}
          onLocales="ru"
          values={{ name: game.name }}
          strs={['game.imgur_seo_li_1', 'game.imgur_seo_li_2', 'game.imgur_seo_li_3']}
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
            {results.map((image, index) => {
              const backgroundImage = `url(${image.thumbnails.medium})`;
              return (
                <div
                  className="game-subpage__block-item game-subpage__imgur-item"
                  onClick={() => this.openViewer('imgur', index)}
                  style={{ backgroundImage }}
                  key={image.id}
                  role="button"
                  tabIndex={0}
                >
                  <div className="game-subpage__block-item__hover" style={{ backgroundImage }} />
                </div>
              );
            })}
          </div>
        </ListLoader>
        {viewerVisible && <GameViewer content={viewerContent} activeIndex={viewerIndex} onClose={this.closeViewer} />}
      </GameSubpage>
    );
  }
}
