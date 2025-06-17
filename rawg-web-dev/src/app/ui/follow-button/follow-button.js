/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { connect } from 'react-redux';
import cn from 'classnames';

import checkLogin from 'tools/check-login';

import Button from 'app/ui/button';
import { followUser, unfollowUser } from 'app/pages/activity/activity.actions';

import './follow-button.styl';

@connect()
export default class FollowButton extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    id: PropTypes.number,
    following: PropTypes.bool,
    follow_loading: PropTypes.bool,
  };

  static defaultProps = {
    id: 0,
    following: false,
    follow_loading: false,
  };

  follow = () => {
    const { dispatch, id } = this.props;

    checkLogin(dispatch, () => {
      dispatch(followUser(id));
    });
  };

  unfollow = () => {
    const { dispatch, id } = this.props;
    dispatch(unfollowUser(id));
  };

  render() {
    const { following, follow_loading } = this.props;
    return (
      <Button
        className={cn('follow-button', { 'follow-button__checked': following })}
        // kind="fill"
        // size="small"
        disabled={follow_loading}
        loading={follow_loading}
        onClick={following ? this.unfollow : this.follow}
      >
        {following ? (
          <div className="follow-button__checked-icon follow-button__sign" />
        ) : (
          <div className="follow-button__sign">+</div>
        )}
        <FormattedMessage id={`profile.${following ? 'following' : 'follow'}`} />
      </Button>
    );
  }
}
