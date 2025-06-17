import React from 'react';
import PropTypes from 'prop-types';
import SVGInline from 'react-svg-inline';

import './source-info.styl';

import appStoreIcon from 'assets/icons/stores/appstore.svg';
import steamIcon from 'assets/icons/stores/steam.svg';

const icons = {
  'apple-appstore': appStoreIcon,
  steam: steamIcon,
};

const propTypes = {
  review: PropTypes.shape().isRequired,
};

const ReviewCardSourceInfo = ({ review }) => {
  if (!review.external_store.slug) {
    return null;
  }

  return (
    <div className="review-card__source-info">
      <div className="review-card__source-info__text">
        Translated by
        <br />
        Microsoft from {review.external_lang}
      </div>
      <div className="review-card__source-info__logo">
        <SVGInline svg={icons[review.external_store.slug]} />
      </div>
    </div>
  );
};

ReviewCardSourceInfo.propTypes = propTypes;

export default ReviewCardSourceInfo;
