import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';

import noop from 'lodash/noop';
import indexOf from 'lodash/indexOf';
import isEmpty from 'lodash/isEmpty';
import isFinite from 'lodash/isFinite';

import evolve from 'ramda/src/evolve';
import without from 'ramda/src/without';

import './rate-games-list.styl';

import { inputs } from 'tools/html/inputs';

import { isNewUser } from 'app/pages/login/login.helper';

import { sendAnalyticsRate, sendOurAnalyticsRate } from 'scripts/analytics-helper';

import { allAccounts } from 'app/pages/accounts-import/accounts-import.helpers';

import {
  countPositivelyRated,
  canShowShare,
  canShowImport,
  getNotConnectedStores,
  getInitItems,
  addSlide,
  removeSlides,
  SHARE_CARD_VISIBILITY_COUNT,
} from 'app/components/rate-games-list/rate-games-list.helpers';

import { LOCAL_RATEGAMES_WELCOME } from 'app/pages/app/components/notifications/notifications.constants';

import getFetchState, { fetchStateType } from 'tools/get-fetch-state';
import findNearestIndex from 'tools/array/find-nearest-index';

import SliderArrow from 'app/ui/slider-arrow';
import Slider from 'app/ui/slider';
import RateCard from 'app/ui/rate-card';
import SignupCard from 'app/components/signup-card';

import {
  checkImportProgress,
  addNotification,
  NOTIF_STATUS_SUCCESS,
} from 'app/pages/app/components/notifications/notifications.actions';

import LoggerEmitter from 'app/pages/app/components/logger/logger.emitter';

import currentUserType from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';

import paths from 'config/paths';
import RateCardPlaceholder from './components/rate-card-placeholder';
import AllRated from './components/all-rated';
import ShareRated from './components/share-rated';
import ImportGames from './components/import-games';

const mapStateToProperties = (state) => ({
  ratedGamesPercent: state.currentUser.rated_games_percent,
  currentUser: state.currentUser,
  fetchState: getFetchState(state),
});

const componentPropertyTypes = {
  fetchState: fetchStateType.isRequired,
  games: PropTypes.shape({
    results: PropTypes.array.isRequired,
    loading: PropTypes.bool.isRequired,
    rated: PropTypes.number.isRequired,
    count: PropTypes.number.isRequired,
    next: PropTypes.number,
  }).isRequired,
  dispatch: PropTypes.func.isRequired,
  ratedGames: PropTypes.arrayOf(PropTypes.shape({})),
  currentUser: currentUserType.isRequired,
  percentUpdate: PropTypes.func,
  changeRating: PropTypes.func,
  removeRatedGame: PropTypes.func,
  unloadRatedGames: PropTypes.func,
  loadGames: PropTypes.func,
  location: locationShape,
  ratedText: PropTypes.string,
  isShareVisible: PropTypes.bool,
  isImportVisible: PropTypes.bool,
  type: PropTypes.string,

  // он используется в rate-games-list.helpers
  // eslint-disable-next-line react/no-unused-prop-types
  isSignupVisible: PropTypes.bool,
};

const defaultProps = {
  percentUpdate: noop,
  changeRating: noop,
  removeRatedGame: noop,
  unloadRatedGames: noop,
  loadGames: noop,
  ratedGames: [],
  location: null,
  ratedText: undefined,
  isShareVisible: false,
  isSignupVisible: false,
  isImportVisible: false,
  type: undefined,
};

@connect(mapStateToProperties)
class RateGamesList extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.keydownListenEnabled = true;
    this.state = {
      prevCurrentUserId: this.props.currentUser.id,
      currentSlide: 0,
      ratingId: 0,
      isRemoved: false,
      loading: true,
      items: [],
    };

    this.sliderRef = React.createRef();
  }

  componentDidMount() {
    const { currentUser, location } = this.props;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('focus', this.onFocus, true);
    window.addEventListener('blur', this.onBlur, true);

    this.setState({ loading: false });

    if (
      currentUser.id &&
      location.pathname === paths.rateTopGames &&
      currentUser.games_count > 0 &&
      currentUser.rated_games_percent < 100
    ) {
      setTimeout(() => {
        this.props.dispatch(
          addNotification({
            id: LOCAL_RATEGAMES_WELCOME,
            weight: 6,
            authenticated: true,
            local: true,
            fixed: true,
            autoHideFixed: false,
            expires: 30,
            message: (
              <FormattedMessage
                id="shared.notifications_rategames_start"
                values={{
                  username: currentUser.fullName || currentUser.username,
                  rateLink: (
                    <Link to={paths.rateUserGames}>
                      <FormattedMessage id="shared.notifications_rategames_start_link" />
                    </Link>
                  ),
                }}
              />
            ),
            status: NOTIF_STATUS_SUCCESS,
          }),
        );
      }, 2000);
    }
  }

  // needs for fix react-click bug
  // (current in afterChange is not correct when results.length === 1)
  static getDerivedStateFromProps(props, state) {
    const newState = {};
    const { isImportVisible, currentUser } = props;
    const { results } = props.games;

    if (state.items.length === 0 && results.length !== 0) {
      newState.items = getInitItems(props, state.currentSlide);
    } else if (results.length === 0) {
      newState.items = [];
    }

    if (results && results.length === 1 && state.currentSlide !== 0) {
      newState.currentSlide = 0;
    }

    if (state.prevCurrentUserId && !currentUser.id) {
      newState.items = getInitItems(props, state.currentSlide);
      newState.prevCurrentUserId = currentUser.id;
    }

    if (!state.prevCurrentUserId && currentUser.id) {
      if (isNewUser()) {
        let idx = -1;
        newState.items = state.items.reduce((array, item) => {
          idx += 1;
          if (idx === state.currentSlide || item !== 'signup') {
            return [...array, item];
          }
          return array;
        }, []);
      } else {
        newState.items = removeSlides('signup', state.items);
      }
      newState.prevCurrentUserId = currentUser.id;

      if (canShowImport({ isImportVisible, currentUser })) {
        const availableItems = getNotConnectedStores(currentUser);
        const startSlide = state.currentSlide + 5;

        availableItems.forEach((store, i) => {
          newState.items = addSlide(store, startSlide + i, newState.items);
        });
      }
    }

    if (newState.items && newState.items.length !== state.items.length) {
      const oldItem = state.items[state.currentSlide];
      newState.currentSlide = (() => {
        if (typeof oldItem === 'undefined') {
          return 0;
        }

        if (typeof oldItem === 'string') {
          return findNearestIndex(newState.items, oldItem, state.currentSlide);
        }

        return newState.items.findIndex((itm) => itm.id === oldItem.id);
      })();
    }

    if (isEmpty(newState)) {
      return null;
    }

    return newState;
  }

  componentDidUpdate(previousProperties, previousState) {
    // eslint-disable-next-line no-undef
    const { games, ratedGames, isShareVisible, currentUser } = this.props;
    const { items, currentSlide } = this.state;

    if (document && games.results.length === 0 && !games.loading) {
      document.removeEventListener('keydown', this.handleKeyDown);
    }

    if (previousProperties.games.rated !== games.rated) {
      this.loadHandler({ current: currentSlide });
    }

    if (
      !currentUser.id &&
      countPositivelyRated(previousProperties.ratedGames) === SHARE_CARD_VISIBILITY_COUNT - 1 &&
      items.length > 0 &&
      canShowShare({ isShareVisible, ratedGames, currentUser }) &&
      !items.includes('share')
    ) {
      this.setItems((previousItems) => addSlide('share', currentSlide + 2, previousItems));
    }

    if (games.count === 0 && games.loading === false && games.rated > 0 && previousProperties.games.count !== 0) {
      this.sendAnalytics('finished');
    }

    if (this.needsLoadGames()) this.loadGames();

    if (currentSlide !== previousState.currentSlide && this.sliderRef.current) {
      this.sliderRef.current.slickGoTo(currentSlide, true);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('focus', this.onFocus, true);
    window.removeEventListener('blur', this.onBlur, true);
  }

  setKeydownListen = (value) => {
    this.keydownListenEnabled = value;
  };

  getGamesCount() {
    const { results } = this.props.games;

    return results && results.length;
  }

  setItems(callback) {
    this.setState((state) => ({ items: callback(state.items) }));
  }

  changeRating = async ({ rating, game }) => {
    const { percentUpdate, changeRating, removeRatedGame } = this.props;

    this.setState({ changing: true });
    await changeRating({ rating, game });
    percentUpdate();

    this.setState({ isRemoved: true });
    removeRatedGame(game);

    setTimeout(() => {
      this.setState((state) => ({
        changing: false,
        isRemoved: false,
        items: removeSlides(game, state.items),
      }));
    }, 200);

    this.sendAnalytics('review', rating);
  };

  keysHandler = (id, game, delay) => {
    if (game && this.state.ratingId !== id) {
      this.setState({ ratingId: id });
      setTimeout(() => {
        this.changeRating({ rating: id, game });
        this.setState({ ratingId: 0 });
      }, delay);
    }
  };

  handleKeyDown = (event) => {
    const { currentSlide, items, changing } = this.state;

    const DELAY = 200;
    const isNotArrowKey = ![39, 37].includes(event.keyCode);
    const isNotGameSlide = typeof items[currentSlide] === 'string';
    const isNotFirstSlide = currentSlide !== 0;
    const isNotLastSlide = currentSlide !== items.length - 1;

    if ((isNotArrowKey && isNotGameSlide) || changing || !this.keydownListenEnabled) {
      return;
    }

    switch (event.keyCode) {
      // right
      case 39:
        if (items.length > 1 && isNotLastSlide && this.sliderRef.current) {
          this.sliderRef.current.slickGoTo(currentSlide + 1);
        }
        break;
      // left
      case 37:
        if (items.length > 1 && isNotFirstSlide && this.sliderRef.current) {
          this.sliderRef.current.slickGoTo(currentSlide - 1);
        }
        break;
      // Q for Exeptional
      case 81:
        this.keysHandler(5, items[currentSlide], DELAY);
        break;
      // W for Recommended
      case 87:
        this.keysHandler(4, items[currentSlide], DELAY);
        break;
      // A for Meh
      case 65:
        this.keysHandler(3, items[currentSlide], DELAY);
        break;
      // S for Skip
      case 83:
        this.keysHandler(1, items[currentSlide], DELAY);
        break;
      // esc
      case 27:
        break;
      default:
        break;
    }
  };

  onFocus = (event) => {
    if (inputs.includes(event.target.tagName)) {
      this.setKeydownListen(false);
    }
  };

  onBlur = (event) => {
    if (inputs.includes(event.target.tagName)) {
      this.setKeydownListen(true);
    }
  };

  sendAnalytics = (action, rating) => {
    const { fetchState: state } = this.props;

    sendAnalyticsRate(action);
    sendOurAnalyticsRate({
      state,
      slug: this.props.type,
      rating,
      action,
    });
  };

  beforeSlideChanged = (current, next) => {
    if (this.beforeSlideChangedDisabled) {
      return;
    }

    const nextItem = this.state.items[next];
    const currentItem = this.state.items[current];

    if (nextItem === 'signup') {
      this.sendAnalytics('signup-show');
    }

    if (currentItem === 'signup' && nextItem !== 'signup') {
      this.sendAnalytics('signup-skip');
    }

    if (current < next) {
      this.sendAnalytics('skip');
    } else if (current > next) {
      this.sendAnalytics('return');
    }

    setTimeout(() => {
      this.setState({ currentSlide: next });
      this.loadHandler({ current: next });
    }, 120);
  };

  loadGames = () => {
    if (this.loading) {
      return;
    }

    this.loading = true;

    const { loadGames } = this.props;
    const loaded = loadGames();
    if (loaded) {
      loaded.then(() => {
        this.updateItems(this.props.games);
        this.loading = false;
      });
    } else {
      this.loading = false;
    }
  };

  unloadRatedGames = (count, current) => {
    this.beforeSlideChangedDisabled = true;

    const { unloadRatedGames } = this.props;

    const unload = unloadRatedGames(count);
    if (unload && this.sliderRef.current) {
      unload.then(() => {
        this.updateItems(this.props.games, (current || this.state.currentSlide) - count);
      });
    } else {
      this.beforeSlideChangedDisabled = false;
    }
  };

  loadHandler = ({ current }) => {
    const { games } = this.props;
    const { next, results } = games;

    const GAMES_BEFORE_LOAD = 4;
    const MIN_GAMES = 5;
    const MAX_GAMES_BEFORE_UNLOAD = 29;
    const POSITION_FOR_UNLOAD = 22;
    const GAMES_FOR_UNLOAD = 15;

    if (!next) {
      return null;
    }

    if (results.length - current <= GAMES_BEFORE_LOAD || results.length === MIN_GAMES) {
      setTimeout(() => this.loadGames(), 300);
    }

    if (
      !this.beforeSlideChangedDisabled &&
      results.length > MAX_GAMES_BEFORE_UNLOAD &&
      current >= POSITION_FOR_UNLOAD
    ) {
      this.unloadRatedGames(GAMES_FOR_UNLOAD);
    }

    return null;
  };

  hideImportCard = (store) => {
    this.setItems((previousItems) => removeSlides(store, previousItems));
  };

  onSuccessfullConnect = (provider) => {
    const { dispatch, currentUser } = this.props;
    dispatch(
      checkImportProgress({
        force: true,
        text: 'shared.notifications_import_progress_rategames',
        values: {
          username: currentUser.full_name || currentUser.username,
        },
      }),
    );

    this.setState(
      evolve({
        items: without([provider]),
      }),
    );
  };

  updateItems(games, current) {
    this.setState(
      (state) => ({
        items: games.results,
        currentSlide: isFinite(current) ? current : state.currentSlide,
      }),
      () => {
        setTimeout(() => {
          this.sliderRef.current.slickGoTo(current, true);
          setTimeout(() => {
            this.beforeSlideChangedDisabled = false;
          }, 20);
        }, 100);
      },
    );
  }

  isLoading() {
    const { loading } = this.props.games;

    return this.state.loading || (loading && !this.getGamesCount());
  }

  needsLoadGames() {
    const { games } = this.props;
    const { count, loading } = games;

    return count > 0 && this.getGamesCount() === 0 && !loading;
  }

  renderAllRated = () => {
    const {
      currentUser: { slug },
      ratedText,
    } = this.props;

    return slug ? <AllRated userSlug={slug} ratedText={ratedText} /> : this.renderSignupCard({ centred: true });
  };

  renderAloneItem(cardData) {
    const { ratingId, isRemoved, changing } = this.state;

    return (
      <RateCard
        isActive={!changing}
        isRemoved={isRemoved}
        ratingEvent={ratingId}
        currentSlide={0}
        game={cardData}
        className="rate-games-list__card rate-games-list__card_alone"
        changeRating={this.changeRating}
      />
    );
  }

  renderItem = (game, index) => {
    const { currentSlide, ratingId, isRemoved, changing } = this.state;

    if (currentSlide === index) {
      LoggerEmitter.emit({
        text: `current game: ${game.id}.${game.slug}, idx: ${index}!`,
        group: 'rateGames',
      });
    }

    return (
      <RateCard
        isActive={index === currentSlide && !changing}
        isRemoved={index === currentSlide && isRemoved}
        ratingEvent={index === currentSlide ? ratingId : undefined}
        currentSlide={currentSlide}
        game={game}
        key={game.id}
        className="rate-games-list__card"
        changeRating={this.changeRating}
      />
    );
  };

  renderImportCard(store) {
    const { currentUser, dispatch } = this.props;

    return (
      <ImportGames
        key={store}
        className="rate-games-list__card"
        currentUser={currentUser}
        store={store}
        dispatch={dispatch}
        hideCard={this.hideImportCard}
        onSuccessfullConnect={this.onSuccessfullConnect}
      />
    );
  }

  renderSignupCard({ centred = false, isActive = true } = {}) {
    const { location, dispatch, currentUser } = this.props;

    return (
      <SignupCard
        className={centred ? '' : 'rate-games-list__card'}
        key="signup"
        location={location}
        dispatch={dispatch}
        centred={centred}
        isActive={isActive}
        currentUser={currentUser}
      />
    );
  }

  renderShareCard() {
    const { items, currentSlide } = this.state;
    const index = indexOf(items, 'share');
    return <ShareRated className="rate-games-list__card" isActive={currentSlide === index} key="share" />;
  }

  renderItems() {
    const { items, currentSlide } = this.state;

    return (
      <Slider
        ref={this.sliderRef}
        className="rate-games-list__slider"
        nextArrow={<SliderArrow direction="next" />}
        prevArrow={<SliderArrow direction="prev" />}
        adaptiveHeight={false}
        variableWidth
        swipeToSlide={false}
        infinite={false}
        beforeChange={this.beforeSlideChanged}
        speed={100}
        centerMode
      >
        {items.map((item, index) => {
          if (item === 'share') {
            return this.renderShareCard();
          }

          if (item === 'signup') {
            return this.renderSignupCard({ isActive: currentSlide === index });
          }

          if (allAccounts.includes(item)) {
            return this.renderImportCard(item);
          }

          return this.renderItem(item, index);
        })}
      </Slider>
    );
  }

  render() {
    const { games } = this.props;
    const { results } = games;
    const gamesCount = this.getGamesCount();

    if (gamesCount > 1) {
      return this.renderItems();
    }

    if (gamesCount === 1) {
      return this.renderAloneItem(results[0]);
    }

    if (gamesCount === 0 && !this.isLoading()) {
      return this.renderAllRated();
    }

    return <RateCardPlaceholder />;
  }
}

RateGamesList.defaultProps = defaultProps;

export default RateGamesList;
