import React from 'react';
import { Link } from 'app/components/link';
import SVGInline from 'react-svg-inline';
import PropTypes from 'prop-types';
import cn from 'classnames';
import noop from 'lodash/noop';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import arrowRight from 'assets/icons/arrow-right.svg';

import './view-all-link.styl';

const propTypes = {
  path: PropTypes.string,
  onClick: PropTypes.func,
  position: PropTypes.oneOf(['left', 'right']),
  text: PropTypes.node,
  arrowDirection: PropTypes.oneOf(['top', 'bottom', 'right']),
  isMobileButton: PropTypes.bool,
};

const defaultProps = {
  path: undefined,
  onClick: noop,
  position: 'left',
  text: null,
  arrowDirection: 'right',
  isMobileButton: true,
};

function getClassName(position, isMobileButton) {
  return cn('view-all-link', `view-all-link_${position}`, {
    'view-all-link_mobile-button': isMobileButton,
  });
}

function getIconClassName(direction) {
  return cn('view-all-link__icon', `view-all-link__icon_${direction}`);
}

function renderContent(text, direction) {
  return (
    <>
      {text || <SimpleIntlMessage id="shared.view_all" />}
      <SVGInline className={getIconClassName(direction)} svg={arrowRight} />
    </>
  );
}

const ViewAllLink = ({ path, onClick, position, text, arrowDirection, isMobileButton }) => (
  <span className={getClassName(position, isMobileButton)}>
    {path ? (
      <Link className="view-all-link__link" to={path} href={path}>
        {renderContent(text, arrowDirection)}
      </Link>
    ) : (
      <span className="view-all-link__link" onClick={onClick} role="button" tabIndex="0">
        {renderContent(text, arrowDirection)}
      </span>
    )}
  </span>
);

ViewAllLink.propTypes = propTypes;
ViewAllLink.defaultProps = defaultProps;

export default ViewAllLink;
