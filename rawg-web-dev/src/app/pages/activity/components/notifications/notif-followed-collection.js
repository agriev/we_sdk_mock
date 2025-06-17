import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';

import EventContainer from 'app/components/event-container';
import EventHeader from 'app/components/event-header';
import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';

import followerIcon from './icons/follower.svg';

const componentPropertyTypes = {
  className: PropTypes.string,
  event: PropTypes.shape({
    user: PropTypes.object,
    collections: PropTypes.object,
    created: PropTypes.string,
  }).isRequired,
  personal: PropTypes.bool,
};

const defaultProps = {
  className: '',
  personal: true,
};

const NotifFollowedCollection = ({ className, event, personal }) => {
  const { user, collections } = event;

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

  return (
    <EventContainer
      className={className}
      header={
        <EventHeader user={user} avatarIcon={followerIcon} emoji={false} eventDate={event.created}>
          <FormattedMessage
            id={`feed.feed_action_followed_collection${personal ? '_personal' : ''}`}
            values={{
              user: userLink,
              count: collections.count,
              collections: collectionsLinks,
            }}
          />
        </EventHeader>
      }
    />
  );
};

NotifFollowedCollection.propTypes = componentPropertyTypes;
NotifFollowedCollection.defaultProps = defaultProps;

export default hot(module)(NotifFollowedCollection);
