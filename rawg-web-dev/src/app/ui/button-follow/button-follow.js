import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import noop from 'lodash/noop';

import './button-follow.styl';

import Button from 'app/ui/button';
import SimpleIntlMessage from 'app/components/simple-intl-message';

const propTypes = {
  className: PropTypes.string,
  following: PropTypes.bool,
  followLoading: PropTypes.bool,
  onClick: PropTypes.func,
};

const defaultProps = {
  className: undefined,
  following: false,
  followLoading: false,
  onClick: noop,
};

const ButtonFollow = ({ following, followLoading, onClick, className }) => {
  if (following === undefined) {
    return null;
  }

  return (
    <div
      className={cn('button-follow__wrapper', className, {
        'button-follow__wrapper_on': following,
        'button-follow__wrapper_off': !following,
        'button-follow__wrapper_loading': followLoading,
      })}
    >
      <Button className="button-follow" size="medium" kind="fill" onClick={onClick} loading={followLoading}>
        <SimpleIntlMessage id={following ? 'discover.follow_on' : 'discover.follow_off'} />
      </Button>
    </div>
  );
};

ButtonFollow.propTypes = propTypes;

ButtonFollow.defaultProps = defaultProps;

export default ButtonFollow;
