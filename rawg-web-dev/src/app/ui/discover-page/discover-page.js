import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import get from 'lodash/get';

import Page from 'app/ui/page';

import './discover-page.styl';

const propTypes = {
  children: PropTypes.node.isRequired,
  prechildren: PropTypes.node,
  pageProperties: PropTypes.shape(),
  className: PropTypes.string,
  isPhoneSize: PropTypes.bool.isRequired,
  heading: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  sharePathname: PropTypes.string,
  headerRightContent: PropTypes.node,
};

const defaultProps = {
  pageProperties: undefined,
  className: undefined,
  heading: undefined,
  description: undefined,
  sharePathname: undefined,
  headerRightContent: undefined,
};

const DiscoverPage = ({
  children,
  prechildren,
  className,
  pageProperties,
  isPhoneSize,
  heading,
  description,
  headerRightContent,
}) => {
  const pagePropertiesFinal = {
    ...pageProperties,
    sidebarProperties: {
      heading,
      onlyOnPhone: false,
      ...get(pageProperties, 'sidebarProperties'),
    },
  };

  const showContentHeader = (!isPhoneSize && heading) || !!headerRightContent;

  return (
    <Page prechildren={prechildren} className={cn('discover-page', className)} {...pagePropertiesFinal}>
      <div className="discover-page__content">
        {showContentHeader && (
          <div className="discover-page__content-header">
            <div className="discover-page__content-header__left">{!isPhoneSize && heading}</div>
            <div className="discover-page__content-header__right">{headerRightContent}</div>
          </div>
        )}
        {description}
        {children}
      </div>
    </Page>
  );
};

DiscoverPage.propTypes = propTypes;
DiscoverPage.defaultProps = defaultProps;

export default DiscoverPage;
