/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import prop from 'ramda/src/prop';

import './user-card-similar.styl';

import len from 'tools/array/len';

import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';
import Avatar from 'app/ui/avatar';
import FollowedCounter from 'app/ui/followed-counter';

const componentPropertyTypes = {
  className: PropTypes.string,
  message: PropTypes.func,
  messageArgument: PropTypes.any,
  enableFollowButton: PropTypes.bool,
  user: PropTypes.shape({
    avatar: PropTypes.string,
    slug: PropTypes.string,
    full_name: PropTypes.string,
    username: PropTypes.string,
    games: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
      }),
    ),
  }),
};

const defaultProps = {
  className: '',
  user: {},
  message: (user) => {
    if (len(user.games) === 0) {
      return null;
    }

    const messageProperties = {
      id: 'feed.similar_list_games',
      values: {
        list: user.games.map(prop('name')).join(', '),
      },
    };

    return <FormattedMessage {...messageProperties} />;
  },
  messageArgument: undefined,
  enableFollowButton: true,
};

const UserCardSimilar = ({ className, user, message, messageArgument, enableFollowButton }) => {
  const { avatar, slug, full_name, username } = user;

  return (
    <div className={cn('user-card-similar', className)}>
      <Link className="user-card-similar__link" to={paths.profile(slug)}>
        <Avatar className="user-card-similar__avatar" size={40} src={avatar} profile={user} />
      </Link>
      <div className="user-card-similar__info-wrap">
        <Link className="user-card-similar__link" to={paths.profile(slug)}>
          <h4 className="user-card-similar__name">{appHelper.getName({ full_name, username })}</h4>
        </Link>
        <div className="user-card-similar__text">{message(user, messageArgument)}</div>
      </div>
      {enableFollowButton && <FollowedCounter user={user} className="user-card-similar__followed-counter" />}
    </div>
  );
};

UserCardSimilar.propTypes = componentPropertyTypes;

UserCardSimilar.defaultProps = defaultProps;

export default UserCardSimilar;
