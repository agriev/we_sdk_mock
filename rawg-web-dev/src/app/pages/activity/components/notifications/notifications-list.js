import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { Link } from 'app/components/link';
import { compose } from 'recompose';
import { FormattedMessage } from 'react-intl';
import SVGInline from 'react-svg-inline';

import onlyUpdateForKeysDeep from 'tools/only-update-for-keys-deep';

import remindIcon from 'assets/icons/remind.svg';

import paths from 'config/paths';
import appHelper from 'app/pages/app/app.helper';

import LoadMore from 'app/ui/load-more';
import currentUserType from 'app/components/current-user/current-user.types';

import NotifFollowed from './notif-followed';
import NotifFollowedCollection from './notif-followed-collection';
import NotifRatedCollection from './notif-rated-collection';
import NotifLikedCommentOnReview from './notif-liked-comment-on-review';
import NotifAddedCommentOnReview from './notif-added-comment-on-review';
import NotifLikedCommentOnPost from './notif-liked-comment-on-post';
import NotifAddedCommentOnPost from './notif-added-comment-on-post';
import NotifLikedCommentOnCollection from './notif-liked-comment-on-collection';
import NotifAddedCommentOnCollection from './notif-added-comment-on-collection';
import NotifReplyOnCommentOnReview from './notif-reply-on-comment-on-review';
import NotifReplyOnCommentOnPost from './notif-reply-on-comment-on-post';
import NotifReplyOnCommentOnCollection from './notif-reply-on-comment-on-collection';

import ExploreGamesEvents from '../explore/explore-games-events';

import {
  ACTION_FOLLOWED_USER,
  ACTION_FOLLOWED_COLLECTION,
  ACTION_UPVOTED,
  ACTION_FAVOURITE_COMMENT,
  ACTION_SUGGESTED_GAME_TO_COLLECTION,
  ACTION_ADDED_COMMENT,
  ACTION_GAME_IS_RELEASED,
} from './notifications.event-types';

import './notifications-list.styl';

const componentPropertyTypes = {
  className: PropTypes.string,

  currentUser: currentUserType.isRequired,
};

const defaultProps = {
  className: '',
};

const EventRender = onlyUpdateForKeysDeep(['event.id', 'size', 'event.games'])(({ /* eslint-disable react/prop-types */
  event, currentUser, size, dispatch, allRatings }) => {
  const data = {
    className: 'event-container__notification',
    currentUser,
    event,
    size,
  };

  switch (event.action) {
    case ACTION_FOLLOWED_USER: {
      return <NotifFollowed {...data} />;
    }

    case ACTION_FOLLOWED_COLLECTION: {
      return <NotifFollowedCollection {...data} />;
    }

    case ACTION_SUGGESTED_GAME_TO_COLLECTION: {
      const { user, games, collections } = event;
      const collection = collections.results[0];

      const userLink = (
        <Link to={{ pathname: paths.profile(user.slug), state: user }} href={paths.profile(user.slug)}>
          {appHelper.getName(user)}
        </Link>
      );

      const messageProperties = {
        id: 'feed.feed_action_suggested_game_to_collection_personal',
        values: {
          user: userLink,
          count: games.count,
          collection: (
            <Link
              className="event-header__item-link"
              to={paths.collection(collection.slug)}
              href={paths.collection(collection.slug)}
            >
              {collection.name}
            </Link>
          ),
        },
      };
      return (
        <ExploreGamesEvents
          messageProps={messageProperties}
          games={games}
          created={event.created}
          user={user}
          emoji={false}
          reactions={[]}
          feedID={event.id}
          currentUserReaction={[]}
          currentUser={currentUser}
          dispatch={dispatch}
          allRatings={allRatings}
        />
      );
    }

    case ACTION_ADDED_COMMENT: {
      switch (event.model) {
        case 'discussion':
          return event.comments.count === 1 ? (
            <NotifAddedCommentOnPost {...data} />
          ) : (
            <NotifReplyOnCommentOnPost {...data} />
          );
        case 'review':
          return event.comments.count === 1 ? (
            <NotifAddedCommentOnReview {...data} />
          ) : (
            <NotifReplyOnCommentOnReview {...data} />
          );
        case 'collectionfeed':
          return event.comments.count === 1 ? (
            <NotifAddedCommentOnCollection {...data} />
          ) : (
            <NotifReplyOnCommentOnCollection {...data} />
          );
        default:
          return null;
      }
    }

    case ACTION_FAVOURITE_COMMENT: {
      switch (event.model) {
        case 'discussion':
          return <NotifLikedCommentOnPost {...data} />;
        case 'review':
          return <NotifLikedCommentOnReview {...data} />;
        case 'collectionfeed':
          return <NotifLikedCommentOnCollection {...data} />;
        default:
          return null;
      }
    }

    case ACTION_UPVOTED: {
      switch (event.model) {
        case 'discussion':
          return null;
        case 'review':
          return null;
        case 'collection':
          return <NotifRatedCollection {...data} />;
        default:
          return null;
      }
    }

    case ACTION_GAME_IS_RELEASED: {
      return (
        <ExploreGamesEvents
          className="notifications__game-is-released"
          messageProps={{ id: 'feed.feed_action_game_is_released' }}
          games={event.games}
          created={event.created}
          emoji={false}
          icon={<SVGInline svg={remindIcon} />}
          reactions={[]}
          feedID={event.id}
          currentUserReaction={[]}
          currentUser={currentUser}
          dispatch={dispatch}
          allRatings={allRatings}
        />
      );
    }

    default:
      return null;
  }
});

const NotificationsList = ({
  events: { count, next, loading, results },
  className,
  currentUser,
  load,
  size,
  dispatch,
  allRatings,
}) => (
  <div className={['notifications-list', className].join(' ')}>
    {loading === false && results.length === 0 && (
      <div className="notifications-list__empty-state">
        <div className="notifications-list__empty-state-icon" />
        <div className="notifications-list__empty-state-text">
          <FormattedMessage id="feed.empty_notifications" />
        </div>
      </div>
    )}
    <LoadMore appSize={size} load={load} count={count} next={next} loading={loading} isOnScroll>
      {results.map((event) => (
        <EventRender
          currentUser={currentUser}
          event={event}
          key={event.id}
          size={size}
          dispatch={dispatch}
          allRatings={allRatings}
        />
      ))}
    </LoadMore>
  </div>
);

NotificationsList.propTypes = componentPropertyTypes;
NotificationsList.defaultProps = defaultProps;

const hoc = compose(hot(module));

export default hoc(NotificationsList);
