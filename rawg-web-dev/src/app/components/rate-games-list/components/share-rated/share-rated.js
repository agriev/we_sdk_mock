import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import { compose, onlyUpdateForKeys } from 'recompose';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';
// import domToImage from 'dom-to-image';
import { saveAs } from 'file-saver';

// import transparentPx from 'assets/transparent-px.png?external';

import get from 'lodash/get';

import './share-rated.styl';

import { RATINGS } from 'app/ui/rate-card/rate-card.helper';

import currentUserType from 'app/components/current-user/current-user.types';
import { getRatedGames } from 'app/pages/rate-games/rate-games.helper';
import {
  getRatedGroups,
  getBackgroundImage,
  getCoverStyle,
  calcRatedGames,
} from 'app/components/rate-games-list/components/share-rated/share-rated.helpers';

import getFetchState, { fetchStateType } from 'tools/get-fetch-state';
import fetch from 'tools/fetch';

import paths from 'config/paths';

import Platforms from 'app/ui/platforms';
import Rating from 'app/ui/rating';
import Avatar from 'app/ui/avatar';
import Loading2 from 'app/ui/loading-2';

import downloadArrow from './assets/download-arrow.svg';

const hoc = compose(
  hot(module),
  connect((state) => ({
    currentUser: state.currentUser,
    allGames: state.rateGames,
    ratedGames: getRatedGames(),
    allRatings: state.app.ratings,
    fetchState: getFetchState(state),
  })),
  onlyUpdateForKeys(['currentUser', 'allGames', 'ratedGames', 'isActive']),
);

const componentPropertyTypes = {
  fetchState: fetchStateType.isRequired,
  isActive: PropTypes.bool.isRequired,
  className: PropTypes.string,
  currentUser: currentUserType.isRequired,
  allGames: PropTypes.shape({
    count: PropTypes.number,
    results: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  ratedGames: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      slug: PropTypes.string,
      rating: PropTypes.number,
    }),
  ).isRequired,
};

const defaultProps = {
  className: '',
};

@hoc
class ShareRated extends React.Component {
  static propTypes = componentPropertyTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      savingImg: false,
      ratedGames: [],
    };

    this.shareCardRef = React.createRef();
  }

  componentDidMount() {
    import('html2canvas').then((html2canvas) => {
      this.html2canvas = html2canvas;
    });
  }

  componentDidUpdate(previousProperties) {
    if (this.props.currentUser.id && this.props.isActive && !previousProperties.isActive) {
      this.loadRatedGames();
    }
  }

  static getDerivedStateFromProps(props) {
    if (props.isActive === false && props.currentUser.id) {
      return {
        ratedGames: [],
      };
    }

    return null;
  }

  loadRatedGames = async () => {
    const { fetchState: state } = this.props;

    this.setState({ loading: true, ratedGames: [] });

    const [exceptional, recommended] = await Promise.all([
      fetch(`/api/users/${this.props.currentUser.slug}/reviews?page=1&rating=5`, {
        state,
      }),
      fetch(`/api/users/${this.props.currentUser.slug}/reviews?page=1&rating=4`, {
        state,
      }),
    ]);

    if (this.props.isActive) {
      this.setState({
        ratedGames: calcRatedGames({ exceptional, recommended }),
        loading: false,
      });
    }
  };

  getRatedGames = () => {
    if (this.props.currentUser.id) {
      return this.state.ratedGames;
    }

    return this.props.ratedGames;
  };

  onDownloadClick = async () => {
    this.setState({ savingImg: true });

    try {
      const { currentUser } = this.props;
      const { slug } = currentUser;
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      // Вариант с либой dom-to-image. Глючит, когда пытается рендерить иконки платформ :(
      // const blob = await domToImage.toBlob(this.shareCardRef.current, {
      //   imagePlaceholder: transparentPx,
      // });

      const canvas = await this.html2canvas(this.shareCardRef.current, {
        logging: false,
        timeout: 1000,
      });

      canvas.toBlob((blob) => {
        saveAs(blob, `${slug}-best-games-${year}.${month}.png`);
      }, 'image/png');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Cannot make img from dom :(', error);
    } finally {
      this.setState({ savingImg: false });
    }
  };

  render() {
    const ratedGames = this.getRatedGames();
    const { loading, savingImg } = this.state;
    const { className, currentUser, allGames, isActive, allRatings } = this.props;

    const groups = getRatedGroups({
      currentUser,
      isActive,
      allGames,
      ratedGames,
    });

    const firstGame = get(groups, '[0].games[0]');
    const coverStyle = getCoverStyle({ firstGame, currentUser });

    return (
      <div className={cn('share-rated', className, { 'share-rated_active': isActive })}>
        <div ref={this.shareCardRef} style={coverStyle} className="share-rated__image">
          {currentUser.id && (
            <div className="share-rated__current-user">
              <div className="share-rated__current-user-info">
                <div className="share-rated__current-user-info__name">
                  {currentUser.full_name || currentUser.username}
                </div>
                <div className="share-rated__current-user-info__link">
                  <Link to={paths.profile(currentUser.slug)}>rawg.io{paths.profile(currentUser.slug)}</Link>
                </div>
              </div>
              <div className="share-rated__current-user-avatar">
                <Avatar size={64} src={currentUser.avatar} />
              </div>
            </div>
          )}
          <div className="share-rated__groups">
            {loading && <Loading2 />}
            {firstGame &&
              groups.map((group) => (
                <div key={group.title} className="share-rated__group">
                  <div className="share-rated__group-title">{group.title}</div>
                  <div className="share-rated__group-header">
                    <div className="share-rated__group-header__game">Game</div>
                    <div className="share-rated__group-header__score">Score</div>
                  </div>
                  <div className="share-rated__group-games">
                    {group.games.map((game, idx) => (
                      <div key={game.id} className="share-rated__group-game">
                        <div className="share-rated__group-game__number">{idx + 1}</div>
                        <div
                          className="share-rated__group-game__avatar"
                          style={getBackgroundImage(game.background_image)}
                        />
                        <div className="share-rated__group-game__info">
                          <div className="share-rated__group-game__info-name">{game.name}</div>
                          <div className="share-rated__group-game__info-platforms">
                            {Array.isArray(game.platforms) && game.platforms.length > 0 && (
                              <Platforms
                                platforms={game.platforms}
                                parentPlatforms={game.parent_platforms}
                                size="medium"
                                parents
                                icons
                              />
                            )}
                          </div>
                        </div>
                        <div className="share-rated__group-game__rating">
                          <Rating kind="text" rating={game.rating} allRatings={allRatings} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
          <div className="share-rated__footer">
            <div className="share-rated__footer-icons">
              {RATINGS.map((ratingId) => (
                <Rating allRatings={allRatings} key={ratingId} kind="emoji" rating={ratingId} />
              ))}
            </div>
            <div className="share-rated__footer-text">
              Rate your games at{' '}
              <Link to={paths.rateUserGames}>
                rawg.io<strong>{paths.rateUserGames}</strong>
              </Link>
            </div>
          </div>
        </div>
        <div className="share-rated__buttons">
          <div className="share-rated__buttons-title">What a combo!</div>
          <div className="share-rated__buttons-subtitle">Share your neat statistic with friends</div>
          <div className="share-rated__buttons-smalltitle">Share image via</div>
          <button onClick={this.onDownloadClick} type="button" className="share-rated__buttons-btn-download">
            {savingImg ? 'Generating…' : 'Download image'}
          </button>
          <SVGInline className="share-rated__buttons-download-arrow" svg={downloadArrow} />
        </div>
      </div>
    );
  }
}

export default ShareRated;
