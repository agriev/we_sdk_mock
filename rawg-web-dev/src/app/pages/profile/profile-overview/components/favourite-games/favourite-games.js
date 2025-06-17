/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader/root';
import debounce from 'lodash/debounce';
import compact from 'lodash/compact';
import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';

import getAppContainer from 'tools/get-app-container';

import './favourite-games.styl';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import Loading2 from 'app/ui/loading-2';
import CloseButton from 'app/ui/close-button';
import InputSearch from 'app/ui/input-search';
import GameCardMediumSlider from 'app/components/game-card-medium-slider';
import GameCardCompactList from 'app/components/game-card-compact-list';
import GameCardButton from 'app/ui/game-card-button';

import plusIcon from 'assets/icons/plus-small.svg';
import currentUserType from 'app/components/current-user/current-user.types';
import { appSizeType } from 'app/pages/app/app.types';

import { addProfileFavouriteGame, findProfileFavouriteGames } from '../../../profile.actions';

import ProfileTitle from '../profile-title';

@hot
@connect((state, props) => ({
  appSize: state.app.size,
  allRatings: state.app.ratings,
  currentUser: state.currentUser,
  profile: state.profile,
  favouriteGames: denormalizeGamesArr(state, `profile.favouriteGames[${props.params.id}].items`, []),
}))
export default class FavouriteGames extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    favouriteGames: PropTypes.arrayOf(PropTypes.object).isRequired,
    allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
    currentUser: currentUserType.isRequired,
    profile: PropTypes.shape().isRequired,
    appSize: appSizeType.isRequired,
  };

  constructor(props, context) {
    super(props, context);

    this.sliderReference = React.createRef();
    this.handleChange = debounce(this.handleChange, 500);

    this.state = {
      position: null,
      search: '',
      adding: false,
      availableGames: [],
      loading: false,
    };
  }

  handleChange = (value) => {
    this.setState({ search: value, loading: true });

    const { dispatch, favouriteGames } = this.props;

    dispatch(findProfileFavouriteGames(value)).then((res) => {
      this.setState({
        availableGames: res.results.filter((game) => !favouriteGames.map((gam) => gam && gam.id).includes(game.id)),
        loading: false,
      });
    });
  };

  toggleAdding = () => {
    this.sliderReference.current.setExpanded(this.state.adding);
    this.setState(
      (state) => ({
        adding: !state.adding,
        search: '',
        availableGames: [],
      }),
      () => {
        getAppContainer().style.overflowY = this.state.adding ? 'hidden' : 'auto';
      },
    );
  };

  handleAddClick = (position) => {
    this.setState({ position }, this.toggleAdding);
  };

  handleAddGameClick = (game) => {
    const { dispatch } = this.props;
    const { position } = this.state;

    dispatch(addProfileFavouriteGame({ position, game }));

    this.toggleAdding();
  };

  render() {
    const { currentUser, profile, favouriteGames, appSize, dispatch, allRatings } = this.props;

    const { adding, availableGames, search, loading } = this.state;

    const isCurrentUser = currentUser.id === profile.user.id;
    const games = favouriteGames || [];

    if (!isCurrentUser && compact(games).length === 0) {
      return null;
    }

    return (
      <div className="profile-favourite">
        <ProfileTitle id="profile.overview_favourite_games_title" />
        <GameCardMediumSlider
          className="profile-favourite__game-cards-list"
          appSize={appSize}
          dispatch={dispatch}
          allRatings={allRatings}
          currentUser={currentUser}
          games={games}
          adding
          addingDisabled={!isCurrentUser}
          onAddClick={this.handleAddClick}
          sliderReference={this.sliderReference}
          gameCardProperties={{
            removeFromFavourites: isCurrentUser,
            gameOwner: profile.user,
          }}
        />
        {adding && (
          <div className="profile-favourite__add-wrapper">
            <div className="profile-favourite__add">
              <CloseButton className="profile-favourite__close-button" onClick={this.toggleAdding} />
              <InputSearch
                className="profile-favourite__search-input"
                value={search}
                autoFocus
                visible={adding}
                onChange={this.handleChange}
              />
              <div>
                {loading ? (
                  <Loading2 className="profile-favourite__loading" radius={48} stroke={2} />
                ) : (
                  <GameCardCompactList
                    games={availableGames}
                    allRatings={allRatings}
                    gameCardProperties={{
                      className: 'profile-favourite__search__game',
                      onClick: (event, game) => this.handleAddGameClick(game),
                      customButtons: (game) => (
                        <GameCardButton
                          onClick={() => this.handleAddGameClick(game)}
                          icon={plusIcon}
                          inner={<SimpleIntlMessage id="profile.add_to_favorites" />}
                          kind="recommend"
                        />
                      ),
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
