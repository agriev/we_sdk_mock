import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import './reward-topline.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  firstMessage: PropTypes.node,
  secondMessage: PropTypes.node,
};

const defaultProps = {
  className: '',
  firstMessage: null,
  secondMessage: null,
};

const RewardTopline = ({ className, firstMessage, secondMessage }) => {
  return (
    <div className={cn('tokens__reward-topline__wrap', className)}>
      <div className="tokens__reward-topline__percent">{firstMessage}</div>
      <div className="tokens__reward-topline__stats">{secondMessage}</div>
    </div>
  );
};

RewardTopline.propTypes = componentPropertyTypes;

RewardTopline.defaultProps = defaultProps;

export default RewardTopline;
