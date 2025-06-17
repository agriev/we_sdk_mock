import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { Link } from 'app/components/link';

import paths from 'config/paths';

import { currentUserIdType } from 'app/components/current-user/current-user.types';
import closeBlackIcon from 'assets/icons/close-black.svg';

import './badge-button.styl';

export const propTypes = {
  bordered: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
  path: PropTypes.string,
  isExpanded: PropTypes.bool,
  mouseHandler: PropTypes.func,
  removeRatingBage: PropTypes.func,
  isPhone: PropTypes.bool.isRequired,
  currentUserId: currentUserIdType.isRequired,
  kind: PropTypes.oneOf(['user', 'top']),
  isTag: PropTypes.bool,
};

const defaultProps = {
  bordered: false,
  className: '',
  path: '',
  isExpanded: false,
  mouseHandler: () => {},
  removeRatingBage: () => {},
  kind: 'user',
  isTag: false,
};

const BadgeButton = ({
  className,
  children,
  path,
  isExpanded,
  mouseHandler,
  removeRatingBage,
  isPhone,
  currentUserId,
  kind,
  isTag,
  bordered,
}) => {
  const badgeClassName = cn('badge-button', `badge-button_${kind}`, className, {
    'badge-button_authorised': !!currentUserId,
    'badge-button_expanded': isExpanded,
    'badge-button_tag': isTag,
    'badge-button_bordered': bordered,
  });

  return isExpanded ? (
    <div className={badgeClassName}>
      <div className="badge-button__wrapper" onMouseLeave={mouseHandler}>
        <Link to={path} className="badge-button__link">
          {children}
        </Link>
        {!isPhone && currentUserId && (
          <span role="button" tabIndex={0} className="badge-button__close" onClick={removeRatingBage}>
            <img src={paths.svgImagePath(closeBlackIcon)} width="10" height="10" alt="close" />
          </span>
        )}
      </div>
    </div>
  ) : (
    <div className={badgeClassName}>
      <div className="badge-button__wrapper" onMouseEnter={mouseHandler}>
        <Link to={path} className="badge-button__link">
          {children}
        </Link>
      </div>
    </div>
  );
};

BadgeButton.propTypes = propTypes;
BadgeButton.defaultProps = defaultProps;

export default BadgeButton;
