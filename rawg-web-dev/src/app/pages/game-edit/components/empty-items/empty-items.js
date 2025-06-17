import React from 'react';
import PropTypes from 'prop-types';

import thinkingIcon from 'assets/icons/emoji/thinking.png';

import './empty-items.styl';

const propTypes = {
  placeholder: PropTypes.shape().isRequired,
};

const EmptyItems = ({ placeholder }) => {
  return (
    <div className="game-edit__empty-item">
      <span className="game-edit__empty-item__emoji">
        <img src={thinkingIcon} alt="thinking face" />
      </span>
      {placeholder}
    </div>
  );
};

EmptyItems.propTypes = propTypes;

export default EmptyItems;
