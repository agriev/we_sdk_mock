import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';

import checkIcon from 'assets/icons/check.svg';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import './wishlist-btn.styl';

const propTypes = {
  status: PropTypes.string,
  preselectedStatus: PropTypes.string,
  onClick: PropTypes.func,
};

const defaultProps = {
  status: undefined,
  preselectedStatus: undefined,
  onClick: undefined,
};

const WishlistButton = ({ status, preselectedStatus, onClick }) => (
  <div
    className={cn('wishlist-btn', {
      'wishlist-btn_active': status === 'toplay' || preselectedStatus === 'toplay',
    })}
    data-status="toplay"
    onClick={onClick}
    role="button"
    tabIndex={0}
  >
    {status === 'toplay' && <SVGInline svg={checkIcon} className="wishlist-btn_active-icon" />}
    <div className="wishlist-btn__icon" />
    <div className="wishlist-btn__icon-title">
      <SimpleIntlMessage id="game-statuses.wishlist" />
    </div>
  </div>
);

WishlistButton.propTypes = propTypes;
WishlistButton.defaultProps = defaultProps;

export default WishlistButton;
