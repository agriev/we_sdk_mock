import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import { compose } from 'recompose';

import EventContainer from 'app/components/event-container';
import EventHeader from 'app/components/event-header';
import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';

import voteUpIcon from './icons/vote-up.svg';

const componentPropertyTypes = {
  className: PropTypes.string,
  event: PropTypes.shape({
    user: PropTypes.object,
    collections: PropTypes.object,
    created: PropTypes.string,
    likes_count: PropTypes.number,
  }).isRequired,
};

const defaultProps = {
  className: '',
};

const NotifRatedCollection = ({ className, event }) => {
  const { user, collections } = event;
  const personal = true;

  const userLink = (
    <Link
      className="event-header__item-link"
      to={{ pathname: paths.profile(user.slug), state: user }}
      href={paths.profile(user.slug)}
    >
      {appHelper.getName(user)}
    </Link>
  );

  const collectionsLinks = (
    <span>
      {collections.results.map(({ slug, name }, idx, array) => (
        <span key={slug}>
          <Link className="event-header__item-link" to={paths.collection(slug)} href={paths.collection(slug)}>
            {name}
          </Link>
          {idx !== array.length - 1 && ', '}
        </span>
      ))}
    </span>
  );

  const messageId = personal ? 'feed.feed_action_like_collection_personal' : 'feed.feed_action_like_collection';

  return (
    <EventContainer
      className={className}
      header={
        <EventHeader user={user} avatarIcon={voteUpIcon} emoji={false} eventDate={event.created}>
          <FormattedMessage
            id={messageId}
            values={{
              user: userLink,
              count: collections.count,
              likes_count: event.likes_count,
              collections: collectionsLinks,
            }}
          />
        </EventHeader>
      }
    />
  );
};

NotifRatedCollection.propTypes = componentPropertyTypes;
NotifRatedCollection.defaultProps = defaultProps;

const hoc = compose(hot(module));

export default hoc(NotifRatedCollection);
