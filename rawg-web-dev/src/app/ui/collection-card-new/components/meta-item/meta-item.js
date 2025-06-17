import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import { appSizeType } from 'app/pages/app/app.types';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

const componentPropertyTypes = {
  description: PropTypes.string,
  icon: PropTypes.string,
  amount: PropTypes.number,
  isPositive: PropTypes.number,
  alignRight: PropTypes.bool,
  images: PropTypes.arrayOf(PropTypes.string),
  size: appSizeType.isRequired,
};

const defaultProps = {
  amount: 0,
  images: undefined,
  description: '',
  icon: undefined,
  isPositive: undefined,
  alignRight: false,
};

const MetaItem = ({ amount, description, icon, isPositive, alignRight, size, images }) => {
  const sign = isPositive ? '+' : '-';

  return (
    <div
      className={cn('collection-card-new__meta-list-item', {
        'collection-card-new__meta-list-item-inline': alignRight,
      })}
    >
      <div
        className={cn(
          'collection-card-new__meta-list-item__amount',
          isPositive && 'collection-card-new__meta-list-item__amount-positive',
          typeof isPositive !== 'undefined' &&
            !isPositive &&
            amount !== 0 &&
            'collection-card-new__meta-list-item__amount-negative',
        )}
      >
        {amount !== 0 && isPositive !== undefined && sign}
        {amount}
        {icon && (
          <div
            className={cn(
              'collection-card-new__meta-list-item__icon',
              `collection-card-new__meta-list-item__icon_${size}_${icon}`,
            )}
          />
        )}
        {images && (
          <img
            src={images[0]}
            srcSet={`${images[1]} 2x`}
            alt=""
            className="collections-card-new__meta-list-item__image"
          />
        )}
      </div>
      <div className="collection-card-new__meta-list-item__description">
        <SimpleIntlMessage id={description} values={{ count: amount }} />
      </div>
    </div>
  );
};

MetaItem.propTypes = componentPropertyTypes;
MetaItem.defaultProps = defaultProps;

export default MetaItem;
