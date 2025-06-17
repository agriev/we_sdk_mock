/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import classnames from 'classnames';
import SVGInline from 'react-svg-inline';

import collectionsIcon from 'assets/icons/collections.svg';
import gamesIcon from 'assets/icons/icon-game-my-games.svg';

import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';

import Avatar from 'app/ui/avatar';
import currentUserType from 'app/components/current-user/current-user.types';

import './user-card.styl';

export const userCardPropTypes = {
  user: currentUserType,
  className: PropTypes.string,
  avatarSize: PropTypes.number,
};

const defaultProps = {
  user: {},
  className: '',
  avatarSize: 40,
};

export default class UserCard extends Component {
  static propTypes = userCardPropTypes;

  get className() {
    const { className } = this.props;

    return classnames('user-card', {
      [className]: className,
    });
  }

  render() {
    const { user, avatarSize } = this.props;
    const { avatar, full_name, username, slug, games_count, collections_count } = user;

    return (
      <div className={this.className}>
        <div className="user-card__info">
          <Avatar className="user-card__avatar" size={avatarSize} src={avatar} profile={user} />
          <div className="user-card__wrap">
            <div className="user-card__name">{appHelper.getName({ full_name, username })}</div>
            <div className="user-card__meta">
              <div className="user-card__meta-counter">
                <SVGInline svg={gamesIcon} width="20px" height="20px" className="user-card__games_icon" />
                {games_count}
              </div>
              <div className="user-card__meta-counter">
                <SVGInline svg={collectionsIcon} width="20px" height="20px" />
                {collections_count}
              </div>
            </div>
          </div>
        </div>
        <Link
          className="user-card__link"
          to={{ pathname: paths.profile(slug), state: user }}
          href={paths.profile(slug)}
        />
      </div>
    );
  }
}

UserCard.defaultProps = defaultProps;
