import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import SleepEmodji from 'assets/icons/emoji/zzz.png';

import './empty-list.styl';

const propTypes = {
  className: PropTypes.string,
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
};

const defaultProps = {
  className: undefined,
};

const getClassName = (className) => cn('empty-list', { className: !!className });

const EmptyList = ({ message, className }) => (
  <div className={getClassName(className)}>
    <img className="empty-list__image" src={SleepEmodji} alt="zzz" />
    {message}
  </div>
);

EmptyList.propTypes = propTypes;
EmptyList.defaultProps = defaultProps;

export default EmptyList;
