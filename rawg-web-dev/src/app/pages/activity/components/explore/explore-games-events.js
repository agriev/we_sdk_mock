/* eslint-disable react/no-danger */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import get from 'lodash/get';

import GameCardCompactList from 'app/components/game-card-compact-list';
import EventContainer from 'app/components/event-container';
import EventHeader from 'app/components/event-header';
import OneGameEvent from 'app/components/one-game-event';
import CollectionFeedItemComments from 'app/components/collection-feed-item-comments';
import UserContent from 'app/ui/user-content';

import currentUserType from 'app/components/current-user/current-user.types';

import './explore-games-events.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  games: PropTypes.shape({
    results: PropTypes.array,
  }),
  users: PropTypes.shape({}),
  userLink: PropTypes.node,
  colors: PropTypes.arrayOf(PropTypes.string),
  icon: PropTypes.node,
  subtitle: PropTypes.node,
  user: PropTypes.shape({}),
  created: PropTypes.string,
  messageProps: PropTypes.shape({}).isRequired,
  emoji: PropTypes.bool,
  reactions: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  feedID: PropTypes.number.isRequired,
  currentUserReaction: PropTypes.arrayOf(PropTypes.number).isRequired,
  isLarge: PropTypes.bool,
  platform: PropTypes.shape({}),
  comments: PropTypes.shape({
    results: PropTypes.array,
  }),
  collections: PropTypes.shape({
    results: PropTypes.array,
  }),
  dispatch: PropTypes.func.isRequired,
  currentUser: currentUserType.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const defaultProps = {
  className: '',
  games: {},
  users: {},
  platform: {},
  user: undefined,
  userLink: undefined,
  colors: undefined,
  icon: undefined,
  subtitle: undefined,
  emoji: true,
  created: new Date().toISOString(),
  isLarge: true,
  comments: {},
  collections: {},
};

const ExploreGamesEvents = (props) => {
  const {
    className,
    dispatch,
    currentUser,
    games,
    users,
    user,
    colors,
    icon,
    subtitle,
    created,
    messageProps,
    feedID,
    isLarge,
    currentUserReaction,
    emoji,
    platform,
    comments,
    collections,
    allRatings,
  } = props;

  const comment =
    Object.keys(comments).length > 0 ? <UserContent content={get(comments, 'results[0].text', '')} /> : undefined;

  const header = (
    <EventHeader
      users={users || undefined}
      user={user}
      icon={icon}
      subtitle={subtitle}
      eventDate={created}
      emoji={emoji}
      feedID={feedID}
      currentUserReaction={currentUserReaction}
      className="explore-games-events__header"
    >
      <FormattedMessage {...messageProps} />
    </EventHeader>
  );

  return (
    <EventContainer
      className={['explore-games-events', className].join(' ')}
      colors={colors}
      comments={comment}
      footer={
        Object.keys(comments).length > 0 && (
          <CollectionFeedItemComments
            className="explore-games-events__collection-comments"
            collection={collections.results[0]}
            item={comments.results[0]}
          />
        )
      }
      platform={platform}
      header={header}
    >
      {games.results.length === 1 ? (
        <OneGameEvent
          game={games.results[0]}
          description=""
          isLarge={isLarge}
          className="explore-games-events__game"
          dispatch={dispatch}
          currentUser={currentUser}
          allRatings={allRatings}
        />
      ) : (
        <GameCardCompactList
          games={games.results}
          allRatings={allRatings}
          currentUser={currentUser}
          dispatch={dispatch}
        />
      )}
    </EventContainer>
  );
};

ExploreGamesEvents.propTypes = componentPropertyTypes;
ExploreGamesEvents.defaultProps = defaultProps;

export default ExploreGamesEvents;
