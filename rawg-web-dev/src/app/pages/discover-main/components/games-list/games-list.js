import React from 'react';
import PropTypes from 'prop-types';
import gameType from 'app/pages/game/game.types';

import passDownProps from 'tools/pass-down-props';
import getPagesCount from 'tools/get-pages-count';

import ListLoader from 'app/ui/list-loader';
import NoResults from 'app/pages/games/components/no-results';
import GameCardMediumList from 'app/components/game-card-medium-list';
import { appSizeType } from 'app/pages/app/app.types';
import appHelper from 'app/pages/app/app.helper';
import GameCardMedium from 'app/components/game-card-medium';
import currentUserType from 'app/components/current-user/current-user.types';

import './games-list.styl';

const propTypes = {
  games: PropTypes.arrayOf(gameType).isRequired,
  count: PropTypes.number.isRequired,
  next: PropTypes.number,
  loading: PropTypes.bool.isRequired,
  loaded: PropTypes.bool.isRequired,
  load: PropTypes.func.isRequired,
  appSize: appSizeType.isRequired,
  pageSize: PropTypes.number.isRequired,
  dispatch: PropTypes.func.isRequired,
  currentUser: currentUserType.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  gameCardProperties: PropTypes.shape(),
  mediumGameCardProperties: PropTypes.shape(),
  beautifyLines: PropTypes.bool,
};

const defaultProps = {
  gameCardProperties: undefined,
  mediumGameCardProperties: undefined,
  beautifyLines: undefined,
};

const DiscoverMainGamesList = ({
  games,
  count,
  next,
  loading,
  loaded,
  load,
  appSize,
  pageSize,
  dispatch,
  currentUser,
  allRatings,
  gameCardProperties,
  mediumGameCardProperties,
  beautifyLines,
}) => {
  const showColumns = !appHelper.isPhoneSize(appSize);
  const showListMedium = appHelper.isPhoneSize(appSize);

  return (
    <ListLoader
      className="discover-main__games-list"
      load={load}
      count={count}
      next={next}
      loading={loading}
      pages={getPagesCount(count, pageSize)}
      showSeoPagination={false}
    >
      {loaded && count === 0 && <NoResults addClearFilterLink={false} />}
      {count > 0 && showColumns && (
        <GameCardMediumList
          appSize={appSize}
          currentUser={currentUser}
          dispatch={dispatch}
          allRatings={allRatings}
          games={games}
          containerWidth={0}
          gameCardProperties={(game) => ({
            showMoreButton: true,
            ...passDownProps(gameCardProperties, game),
            ...passDownProps(mediumGameCardProperties, game),
          })}
          gamesCount={count}
          gamesPerPage={pageSize}
          beautifyLines={beautifyLines}
          float
        />
      )}
      {count > 0 &&
        showListMedium &&
        games.map((game) => (
          <GameCardMedium
            key={game.id}
            className="discover-main__game-card-medium"
            appSize={appSize}
            currentUser={currentUser}
            dispatch={dispatch}
            allRatings={allRatings}
            game={game}
            showAboutText
            showMoreButton
            {...passDownProps(gameCardProperties, game)}
            {...passDownProps(mediumGameCardProperties, game)}
          />
        ))}
    </ListLoader>
  );
};

DiscoverMainGamesList.propTypes = propTypes;
DiscoverMainGamesList.defaultProps = defaultProps;

export default DiscoverMainGamesList;
