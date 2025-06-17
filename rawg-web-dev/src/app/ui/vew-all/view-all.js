import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';

import formatNumber from 'tools/format-number';

import dotsIcon from 'assets/icons/dots.svg';
import dotsLargeIcon from 'assets/icons/dots-large.svg';

import './view-all.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  size: PropTypes.oneOf(['s', 'm', 'l', 'xs']),
  path: PropTypes.string.isRequired,
  message: PropTypes.node,
  count: PropTypes.number,
  isLabel: PropTypes.bool,
  countItemsStr: PropTypes.string,
};

const defaultProps = {
  message: undefined,
  count: undefined,
  isLabel: false,
  countItemsStr: 'items',
  size: 's',
  className: '',
};

const ViewAll = ({ className, size, message, count, isLabel, path, countItemsStr }) => (
  <Link to={path} href={path} className={cn(className, 'view-all', `view-all_${size}`)}>
    <div className="view-all__block">
      <SVGInline className="view-all__dots-icon" svg={size === 'l' ? dotsLargeIcon : dotsIcon} />
      {isLabel && <FormattedMessage id="shared.view_all" className="view-all__block-message" />}
    </div>
    <div className="view-all__info-block">
      {message && <div className="view-all__message">{message}</div>}
      {Boolean(count) && (
        <div className="view-all__count">
          {formatNumber(count)} {countItemsStr}
        </div>
      )}
    </div>
  </Link>
);

ViewAll.propTypes = componentPropertyTypes;
ViewAll.defaultProps = defaultProps;

export default ViewAll;
