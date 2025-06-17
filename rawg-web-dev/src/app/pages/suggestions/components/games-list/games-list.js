import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';

import getPagesCount from 'tools/get-pages-count';

import ListLoader from 'app/ui/list-loader';
import GameCardMediumList from 'app/components/game-card-medium-list';
import GameCardCompactList from 'app/components/game-card-compact-list';

import { ENTITY_PAGE_SIZE } from 'app/pages/suggestions/suggestions.actions';
import currentUserType from 'app/components/current-user/current-user.types';
import { appSizeType } from 'app/pages/app/app.types';
import appHelper from 'app/pages/app/app.helper';

const hoc = compose(hot);

const propTypes = {
  load: PropTypes.func.isRequired,
  games: PropTypes.shape().isRequired,
  items: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentUser: currentUserType.isRequired,
  dispatch: PropTypes.func.isRequired,
  appSize: appSizeType.isRequired,
};

const defaultProps = {
  //
};

const SuggestionsGamesListComponent = ({ load, games, items, currentUser, dispatch, appSize, allRatings }) => {
  const List = appHelper.isDesktopSize(appSize) ? GameCardMediumList : GameCardCompactList;

  return (
    <ListLoader
      load={load}
      count={games.count}
      next={games.next}
      loading={games.loading}
      pages={getPagesCount(games.count, ENTITY_PAGE_SIZE)}
      isOnScroll
    >
      <List
        kind={appHelper.isDesktopSize(appSize) ? 'columns' : 'default'}
        columns={4}
        appSize={appSize}
        currentUser={currentUser}
        dispatch={dispatch}
        games={items}
        allRatings={allRatings}
        gameCardProperties={{
          className: 'suggestions-entity__game-card',
        }}
      />
    </ListLoader>
  );
};

SuggestionsGamesListComponent.propTypes = propTypes;
SuggestionsGamesListComponent.defaultProps = defaultProps;

const SuggestionsGamesList = hoc(SuggestionsGamesListComponent);

export default SuggestionsGamesList;
