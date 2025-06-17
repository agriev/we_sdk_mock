import React from 'react';

import './rate-card-placeholder.styl';

const RateCardPlaceholder = () => (
  <div className="rate-card-placeholder">
    <div className="rate-card-placeholder__cover rate-card-placeholder__animated" />
    <div className="rate-card-placeholder__container">
      <div className="rate-card-placeholder__title rate-card-placeholder__animated rate-card-placeholder__animated_with-delay" />
      <div className="rate-card-placeholder__ratings rate-card-placeholder__animated rate-card-placeholder__animated_with-delay">
        <div className="rate-card-placeholder__button" />
        <div className="rate-card-placeholder__button" />
        <div className="rate-card-placeholder__button" />
        <div className="rate-card-placeholder__button" />
      </div>
    </div>
  </div>
);

export default RateCardPlaceholder;
