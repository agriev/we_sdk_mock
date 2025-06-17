/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';

import FollowButton from 'app/ui/follow-button';

import './followed-counter.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  user: PropTypes.shape({
    following: PropTypes.bool,
    followers_count: PropTypes.number,
    follow_loading: PropTypes.bool,
    id: PropTypes.number,
  }),
};

const defaultProps = {
  className: '',
  user: {},
};

const FollowedCounter = ({ className, user }) => {
  const { following, followers_count, follow_loading, id } = user;

  return (
    <div className={['followed-counter', className].join(' ')}>
      <FollowButton following={following} follow_loading={follow_loading} id={id} />
      <div className="followed-counter__counter">{followers_count}</div>
    </div>
  );
};

FollowedCounter.propTypes = componentPropertyTypes;

FollowedCounter.defaultProps = defaultProps;

export default FollowedCounter;
