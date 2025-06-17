import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader';

import currentUserType from 'app/components/current-user/current-user.types';

import EventContainer from 'app/components/event-container';
import EventHeader from 'app/components/event-header';
import paths from 'config/paths';

import followerIcon from './icons/follower.svg';

import './notif-followed.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  event: PropTypes.shape({
    user: PropTypes.object,
    users: PropTypes.object,
    created: PropTypes.string,
  }).isRequired,
  currentUser: currentUserType.isRequired,
};

const defaultProps = {
  className: '',
};

const NotifFollowed = ({ className, event, currentUser }) => {
  const { users, user } = event;
  const { full_name: fullName, username, slug } = user;
  const personal = users.results.some((usr) => usr.id === currentUser.id);

  const userLink = (
    <Link className="event-header__item-link" to={paths.profile(slug)} href={paths.profile(slug)}>
      {fullName || username}
    </Link>
  );

  return (
    <EventContainer
      className={className}
      header={
        <EventHeader user={user} avatarIcon={followerIcon} emoji={false} eventDate={event.created}>
          <FormattedMessage
            id={`feed.feed_action_followed_user${personal ? '_personal' : ''}`}
            values={{
              user: userLink,
              count: users.count,
            }}
          />
        </EventHeader>
      }
    />
  );
};

NotifFollowed.propTypes = componentPropertyTypes;
NotifFollowed.defaultProps = defaultProps;

export default hot(module)(NotifFollowed);
