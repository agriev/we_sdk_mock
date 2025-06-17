import React from 'react';
import { hot } from 'react-hot-loader/root';
import PropTypes from 'prop-types';
import { compose } from 'recompose';

import isArray from 'lodash/isArray';
import isUndefined from 'lodash/isUndefined';

import './game-card-medium-list.styl';

import GameCardMedium from 'app/components/game-card-medium';
import { appSizeType } from 'app/pages/app/app.types';
import currentUserType from 'app/components/current-user/current-user.types';
import passDownProps from 'tools/pass-down-props';
import DiscoverColumns from 'app/components/discover-columns';

const hoc = compose(hot);

const propTypes = {
  className: PropTypes.string,
  games: PropTypes.arrayOf(PropTypes.object).isRequired,
  gamesCount: PropTypes.number,
  gamesPerPage: PropTypes.number,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  columns: PropTypes.number,
  containerWidth: PropTypes.number,
  gameCardProperties: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  appSize: appSizeType.isRequired,
  currentUser: currentUserType.isRequired,
  dispatch: PropTypes.func.isRequired,
  firstItem: PropTypes.node,
  beautifyLines: PropTypes.bool,
  groupBy: PropTypes.func,
  columnsForced: PropTypes.bool,
  section: PropTypes.string,
};

const defaultProps = {
  className: '',
  containerWidth: 960,
  gameCardProperties: undefined,
  firstItem: undefined,
  columns: undefined,
  gamesCount: undefined,
  gamesPerPage: undefined,
  beautifyLines: undefined,
  groupBy: undefined,
};

const GameCardMediumListComponent = ({
  className,
  games,
  gamesCount,
  gamesPerPage,
  columns,
  columnsForced,
  containerWidth,
  gameCardProperties,
  appSize,
  currentUser,
  dispatch,
  allRatings,
  firstItem,
  beautifyLines,
  groupBy,
  section,
}) => {
  /* eslint-disable react/no-array-index-key */

  if (!isArray(games)) {
    return null;
  }

  const gamesItems = games.map((game) => (
    <GameCardMedium
      key={game.id}
      game={game}
      appSize={appSize}
      currentUser={currentUser}
      dispatch={dispatch}
      allRatings={allRatings}
      {...passDownProps(gameCardProperties, game)}
    />
  ));

  const itemsArray = isUndefined(firstItem) ? gamesItems : [firstItem, ...gamesItems];

  return (
    <DiscoverColumns
      columnsForced={columnsForced}
      className={className}
      columns={columns}
      containerWidth={containerWidth}
      items={itemsArray}
      itemsCount={gamesCount}
      itemsPerPage={gamesPerPage}
      beautifyLines={beautifyLines}
      groupBy={groupBy}
      section={section}
    />
  );
};

GameCardMediumListComponent.propTypes = propTypes;
GameCardMediumListComponent.defaultProps = defaultProps;

const GameCardMediumList = hoc(GameCardMediumListComponent);

export default GameCardMediumList;
