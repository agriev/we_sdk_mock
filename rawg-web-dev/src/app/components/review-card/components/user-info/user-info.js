import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';

import './user-info.styl';

import paths from 'config/paths';
import appHelper from 'app/pages/app/app.helper';

import Avatar from 'app/ui/avatar/avatar';
import Time from 'app/ui/time';
import HiddenLink from 'app/ui/hidden-link/hidden-link';

import ReviewCardYourBadge from '../your-badge';

const propTypes = {
  user: PropTypes.shape(),
  review: PropTypes.shape().isRequired,
  createdDate: PropTypes.shape().isRequired,
  size: PropTypes.string.isRequired,
  your: PropTypes.bool.isRequired,
};

const defaultProps = {
  user: undefined,
};

const ReviewCardUserInfo = ({ user, review, createdDate, size, your }) => {
  const LinkTag = user ? Link : 'div';
  const to = user ? { pathname: paths.profile(user.slug), state: user } : undefined;
  const reviewLink = user ? paths.review(review.id) : review.external_source;
  const avatar = user ? user.avatar : review.external_avatar;
  const name = user ? appHelper.getName(user) : review.external_author;
  const LinkClass = review.is_external ? HiddenLink : Link;

  return (
    <div className="review-card__user">
      {avatar && (
        <LinkTag className="review-card__avatar-link" to={to}>
          <Avatar size={40} src={avatar} profile={user} />
        </LinkTag>
      )}
      <div className="review-card__user-info">
        <LinkTag className="review-card__user-link" to={to}>
          {name}
        </LinkTag>
        {createdDate && (
          <LinkClass className="review-card__date" to={reviewLink} target={review.is_external ? '_blank' : undefined}>
            {review.is_external && `${review.external_store.name}, `}
            <Time date={createdDate} relative={7} />
          </LinkClass>
        )}
      </div>
      {appHelper.isPhoneSize({ size }) && <ReviewCardYourBadge your={your} />}
    </div>
  );
};

ReviewCardUserInfo.propTypes = propTypes;
ReviewCardUserInfo.defaultProps = defaultProps;

export default ReviewCardUserInfo;
