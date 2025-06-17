import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';

import isArray from 'lodash/isArray';

import Tooltip from 'app/ui/rc-tooltip';
import Avatar from 'app/ui/avatar/avatar';
import paths from 'config/paths';

import './user-list-line.styl';

const hoc = compose(hot);

const userShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  slug: PropTypes.string.isRequired,
  avatar: PropTypes.string,
});

const componentPropertyTypes = {
  className: PropTypes.string,
  users: PropTypes.oneOfType([
    PropTypes.shape({
      results: PropTypes.arrayOf(userShape),
      count: PropTypes.number,
      status: PropTypes.string,
    }),
    PropTypes.arrayOf(userShape),
  ]),
  noCount: PropTypes.bool,
  textMessageId: PropTypes.string,
  avatarSize: PropTypes.number,
  maxUsers: PropTypes.number,
};

const defaultProps = {
  className: '',
  users: [],
  noCount: false,
  avatarSize: 24,
  maxUsers: 3,
  textMessageId: 'showcase.users_count',
};

const getUsers = (users) => {
  if (isArray(users)) {
    return {
      usersList: users,
      count: users.length,
    };
  }

  return {
    usersList: users.results,
    count: users.count,
  };
};

const UserListLineComponent = ({ className, users, noCount, avatarSize, maxUsers, textMessageId }) => {
  const renderToolTip = (user) => () => (
    <Link to={paths.profile(user.slug)} href={paths.profile(user.slug)} className="user-list-line__tooltip">
      {user.full_name || user.username}
    </Link>
  );

  const { usersList, count } = getUsers(users);
  const moreUsers = count - maxUsers;

  const lineCountStyle = useMemo(() => ({ width: `${avatarSize}px`, height: `${avatarSize}px` }), [avatarSize]);

  return (
    <div className={['user-list-line', className].join(' ')}>
      {usersList.slice(0, maxUsers).map((user) => (
        <Tooltip key={user.id} trigger={['hover']} placement="bottom" overlay={renderToolTip(user)}>
          <Link
            className="user-list-line__avatar-link"
            to={{ pathname: paths.profile(user.slug), state: user }}
            href={paths.profile(user.slug)}
          >
            <Avatar className="user-list-line__avatar-image" size={avatarSize} src={user.avatar} profile={user} />
          </Link>
        </Tooltip>
      ))}
      {moreUsers > 0 && (
        <div className="user-list-line__count" style={lineCountStyle}>
          <span>…</span>
        </div>
      )}
      {!noCount && moreUsers > 0 && (
        <div className="user-list-line__plus-users">
          <strong>{moreUsers}</strong>
          &nbsp;
          <FormattedMessage id={textMessageId} values={{ usersCount: moreUsers || '0' }} />
        </div>
      )}
      {/* <div className="user-list-line__status">
        <FormattedMessage id="showcase.started_playing" />
      </div> */}
    </div>
  );
};

UserListLineComponent.propTypes = componentPropertyTypes;
UserListLineComponent.defaultProps = defaultProps;

const UserListLine = hoc(UserListLineComponent);

export default UserListLine;
