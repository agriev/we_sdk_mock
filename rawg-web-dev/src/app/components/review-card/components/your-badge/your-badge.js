import React from 'react';
import PropTypes from 'prop-types';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import './your-badge.styl';

const propTypes = {
  your: PropTypes.bool.isRequired,
};

const defaultProps = {};

const ReviewCardYourBadge = ({ your }) => {
  if (!your) return null;

  return (
    <div className="review-card__your-badge">
      <SimpleIntlMessage id="shared.review_your" />
    </div>
  );
};

ReviewCardYourBadge.propTypes = propTypes;
ReviewCardYourBadge.defaultProps = defaultProps;

export default ReviewCardYourBadge;
