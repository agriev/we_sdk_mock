import React from 'react';
import PropTypes from 'prop-types';

import take from 'lodash/take';

import Reaction from 'app/ui/reaction';

import './reactions.styl';

const propTypes = {
  reactions: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  takeOnly: PropTypes.number,
};

const defaultProps = {
  takeOnly: 2,
};

const ReviewCardReactions = ({ reactions, takeOnly }) => {
  if (reactions.length <= 0) {
    return null;
  }

  return (
    <div className="review-card__reactions">
      {take(reactions, takeOnly).map((reaction) => (
        <Reaction className="review-card__reaction" reaction={reaction} key={reaction.id} />
      ))}
    </div>
  );
};

ReviewCardReactions.propTypes = propTypes;
ReviewCardReactions.defaultProps = defaultProps;

export default ReviewCardReactions;
