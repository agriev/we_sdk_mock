import React from 'react';
import PropTypes from 'prop-types';
import find from 'lodash/find';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import { buttonsData, RATINGS } from 'app/ui/rate-card/rate-card.helper.js';

import './user-review.styl';

const componentPropertyTypes = {
  review: PropTypes.shape({
    rating: PropTypes.oneOf(RATINGS).isRequired,
    is_text: PropTypes.bool,
  }).isRequired,
  onEditClick: PropTypes.func.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
};

const UserReview = ({ review, onEditClick, onDeleteClick }) => {
  const reviewData = find(buttonsData, (data) => data.id === review.rating);

  if (!reviewData) return null;

  return (
    <div className="user-review">
      <img
        className={`user-review__icon user-review__icon_${reviewData.type}`}
        src={reviewData.icon}
        alt={reviewData.type}
        title={reviewData.type}
        height="40"
      />
      <span className="user-review__label">{reviewData.label}</span>
      <div className="user-review__actions">
        {review.is_text && (
          <span className="user-review__edit" onClick={onEditClick} role="button" tabIndex="0">
            <SimpleIntlMessage id="shared.edit_review" />
          </span>
        )}
        {!review.is_text && (
          <span className="user-review__delete" onClick={onDeleteClick} role="button" tabIndex="0">
            <SimpleIntlMessage id="shared.button_action_delete" />
          </span>
        )}
      </div>
    </div>
  );
};

UserReview.propTypes = componentPropertyTypes;

export default UserReview;
