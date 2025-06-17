import React from 'react';
import PropTypes from 'prop-types';

import './background.styl';

const propTypes = {
  background: PropTypes.string,
  visible: PropTypes.bool.isRequired,
};

const defaultProps = {
  background: '',
};

const ReviewCardBackground = ({ visible, background }) => (
  <>
    <div
      className="review-card__background"
      style={{
        backgroundImage: visible ? `url(${background})` : 'none',
      }}
    />
    <div className="review-card__obscurer" />
  </>
);

ReviewCardBackground.propTypes = propTypes;
ReviewCardBackground.defaultProps = defaultProps;

export default ReviewCardBackground;
