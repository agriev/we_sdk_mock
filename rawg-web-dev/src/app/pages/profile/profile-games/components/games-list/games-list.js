/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';

import './games-list.styl';

// import appHelper from 'app/pages/app/app.helper';

import LoadMore from 'app/ui/load-more';
import currentUserTypes from 'app/components/current-user/current-user.types';
import { appSizeType } from 'app/pages/app/app.types';

import GameCardMediumList from 'app/components/game-card-medium-list';
// import GameCardCompactList from 'app/components/game-card-compact-list/game-card-compact-list';

const componentPropertyTypes = {
  appSize: appSizeType.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  profile: PropTypes.shape().isRequired,
  currentUser: currentUserTypes.isRequired,
  // intl: intlShape.isRequired,
  // filter: PropTypes.shape().isRequired,
  editing: PropTypes.bool.isRequired,
  // selectedGames: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  load: PropTypes.func.isRequired,
  category: PropTypes.string.isRequired,
  // handleSelectClick: PropTypes.func.isRequired,
  // handleRemoveClick: PropTypes.func.isRequired,
  handleGameCardStatusChange: PropTypes.func.isRequired,
  opened: PropTypes.bool.isRequired,
  isWishlistPage: PropTypes.bool,
  dispatch: PropTypes.func.isRequired,
};

const defaultProps = {
  isWishlistPage: false,
};

@hot
class GamesList extends Component {
  static propTypes = componentPropertyTypes;

  static defaultProps = defaultProps;

  needLoadOnScroll = () => {
    const { category, opened, isWishlistPage } = this.props;
    const isLoading = this.props.profile.games[category].loading;
    const nextPage = this.props.profile.games[category].next;

    if (isWishlistPage) {
      return true;
    }

    if (isLoading || nextPage < 2 || !opened) {
      return false;
    }

    return nextPage % 2 === 1;
  };

  render() {
    const {
      // intl,
      currentUser,
      profile,
      editing,
      // selectedGames,
      load,
      category,
      // handleSelectClick,
      // handleRemoveClick,
      handleGameCardStatusChange,
      appSize,
      allRatings,
      dispatch,
    } = this.props;
    const { games } = profile;

    const { count, results, next, loading } = games[category];

    const gameCardProperties = {
      onStatusChange: handleGameCardStatusChange,
      gameOwner: profile.user,
      className: 'profile-games__item',
      platformsSelectable: true,
    };

    // const List = appHelper.isDesktopSize(appSize) ? GameCardMediumList : GameCardCompactList;

    return (
      <LoadMore
        appSize={appSize}
        load={load}
        count={count}
        next={next}
        loading={loading}
        isOnScroll
        needLoadOnScroll={this.needLoadOnScroll}
      >
        <div className="profile-games__list">
          {/* {editing &&
          // results.map(game => (
          //   <GameCardOld
          //     key={game.id}
          //     className="profile-games__item"
          //     game={game}
          //     add={!selectedGames.map(gm => gm.id).includes(game.id)}
          //     remove={selectedGames.map(gm => gm.id).includes(game.id)}
          //     onAddClick={() => handleSelectClick(game)}
          //     onRemoveClick={() => handleRemoveClick(game)}
          //     meta={`${intl.formatMessage({
          //       id: `shared.game_menu_status_${game.user_game.status}`,
          //     })}${(game.user_game.platforms &&
          //       game.user_game.platforms.length &&
          //       ` | ${game.user_game.platforms
          //         .map(platform => platform.name)
          //         .join(', ')}`) ||
          //       ''}`}
          //     platformsSelectable
          //     select
          //   />
          // ))}
          } */}
          {!editing && (
            <GameCardMediumList
              columns={3}
              games={results}
              currentUser={currentUser}
              dispatch={dispatch}
              appSize={appSize}
              allRatings={allRatings}
              gameCardProperties={gameCardProperties}
            />
          )}
        </div>
      </LoadMore>
    );
  }
}

export default GamesList;
