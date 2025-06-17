import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { injectIntl, FormattedHTMLMessage } from 'react-intl';

import values from 'lodash/values';

import { appSizeType } from 'app/pages/app/app.types';

import { isCurrentUser, getOpenedCategories } from 'app/pages/profile/profile-games/profile-games.helper';

import currentUserTypes from 'app/components/current-user/current-user.types';
import intlShape from 'tools/prop-types/intl-shape';

import CategoryContainer from '../category-container';
import GamesList from '../games-list';

const propTypes = {
  dispatch: PropTypes.func.isRequired,
  profile: PropTypes.shape().isRequired,
  currentUser: currentUserTypes.isRequired,
  filter: PropTypes.shape().isRequired,
  searchValue: PropTypes.string.isRequired,
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  status: PropTypes.string,
  editing: PropTypes.bool,
  isWishlist: PropTypes.bool,
  selectedGames: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  load: PropTypes.func.isRequired,
  handleSelectClick: PropTypes.func.isRequired,
  handleRemoveClick: PropTypes.func.isRequired,
  handleGameCardStatusChange: PropTypes.func.isRequired,
  intl: intlShape.isRequired,
  appSize: appSizeType.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const defaultProps = {
  status: '',
  editing: false,
  isWishlist: false,
};

@injectIntl
export default class GamesByCategories extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  getEmptyMessageId() {
    const { currentUser, profile, status } = this.props;

    const {
      games: { counters },
    } = profile;

    if (status && counters[status]) {
      return 'profile.empty_games_filter';
    }

    return isCurrentUser(currentUser, profile) ? 'profile.empty_games_personal_status' : 'profile.empty_games_status';
  }

  isEmpty() {
    const { isWishlist, profile, categories } = this.props;

    const { games } = profile;
    const { counters } = games;

    const everyCategoryEmpty = !values(counters).some((counter) => counter > 0);
    const everyCategoryLoaded = !categories.some((c) => games[c].loading === true);
    const wishlistEmpty = counters.toplay === 0;

    return (everyCategoryEmpty && everyCategoryLoaded) || (isWishlist && wishlistEmpty);
  }

  renderEmpty() {
    return (
      <div className="profile__empty-text">
        <FormattedHTMLMessage id={this.getEmptyMessageId()} />
      </div>
    );
  }

  renderGamesList({ category, load, opened }) {
    const {
      dispatch,
      profile,
      currentUser,
      filter,
      editing,
      isWishlist,
      selectedGames,
      handleSelectClick,
      handleRemoveClick,
      handleGameCardStatusChange,
      intl,
      appSize,
      allRatings,
    } = this.props;

    return (
      <GamesList
        load={load}
        category={category}
        profile={profile}
        dispatch={dispatch}
        allRatings={allRatings}
        intl={intl}
        currentUser={currentUser}
        filter={filter}
        editing={editing}
        selectedGames={selectedGames}
        handleSelectClick={handleSelectClick}
        handleRemoveClick={handleRemoveClick}
        handleGameCardStatusChange={handleGameCardStatusChange}
        isWishlistPage={isWishlist}
        opened={opened}
        appSize={appSize}
      />
    );
  }

  renderWishlist() {
    const { load } = this.props;

    const category = 'toplay';

    return this.renderGamesList({
      category,
      load: () => load({}, category),
      opened: true,
    });
  }

  renderCategory = (category) => {
    const { currentUser, profile, isWishlist, filter, searchValue, load } = this.props;

    const { games } = profile;
    const openedCategories = getOpenedCategories({
      isCurrentUser: isCurrentUser(currentUser, profile),
    });

    const categorizedGamesCount =
      games.counters.playing + games.counters.beaten + games.counters.dropped + games.counters.yet;

    return (
      <CategoryContainer
        key={category}
        category={category}
        counter={games[category].count}
        categorizedGamesCount={categorizedGamesCount}
        isOpened={isWishlist ? true : openedCategories.includes(category)}
        searchValue={searchValue}
        isCurrentUser={isCurrentUser(currentUser, profile)}
      >
        {({ opened }) =>
          this.renderGamesList({
            category,
            load: () => load({ page: games[category].next, filter }, category),
            opened,
          })
        }
      </CategoryContainer>
    );
  };

  renderCategories() {
    const { categories } = this.props;

    return categories.filter((c) => c !== 'toplay').map(this.renderCategory);
  }

  render() {
    if (this.isEmpty()) {
      return this.renderEmpty();
    }

    return this.props.isWishlist ? this.renderWishlist() : this.renderCategories();
  }
}
