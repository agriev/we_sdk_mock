import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';

import paths from 'config/paths';
import Avatar from 'app/ui/avatar';
import UsersListLine from 'app/ui/user-list-line';
import Time from 'app/ui/time';

import './event-header.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  icon: PropTypes.node,
  avatarIcon: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]).isRequired,
  user: PropTypes.shape(),
  eventDate: PropTypes.string,
  subtitle: PropTypes.node,
  users: PropTypes.shape({
    count: PropTypes.number,
    results: PropTypes.array,
  }),
  rightElement: PropTypes.element,
};

const defaultProps = {
  className: '',
  eventDate: undefined,
  icon: undefined,
  avatarIcon: undefined,
  user: undefined,
  subtitle: undefined,
  users: {
    count: null,
    results: [],
  },
  rightElement: undefined,
};

// eslint-disable-next-line react/prop-types
const Avatars = ({ users, user, icon }) => {
  /* eslint-disable react/prop-types */
  const usersCount = users && users.count;

  return usersCount > 1 ? (
    <UsersListLine users={users} className="event-header__avatars" noCount />
  ) : (
    <Link
      className="event-header__avatar-link"
      to={{ pathname: paths.profile(user.slug), state: user }}
      href={paths.profile(user.slug)}
    >
      <Avatar icon={icon} size={24} src={user.avatar} profile={user} className="event-header__avatars" />
    </Link>
  );
};

const EventHeader = ({ className, children, eventDate, icon, subtitle, users, user, avatarIcon, rightElement }) => (
  <div className={['event-header', className].join(' ')}>
    {icon || <Avatars users={users} user={user} icon={avatarIcon} />}
    <div className={['event-header__info-wrap', subtitle ? 'event-header__subtitle' : ''].join(' ')}>
      {children}
      <div className="event-header__subtitle-wrap">
        {subtitle || (eventDate && <Time date={eventDate} relative={1} />)}
      </div>
    </div>
    {rightElement}
  </div>
);

EventHeader.propTypes = componentPropertyTypes;
EventHeader.defaultProps = defaultProps;

export default EventHeader;
