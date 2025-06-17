import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { compose } from 'recompose';
import cn from 'classnames';

import onlyUpdateForKeysDeep from 'tools/only-update-for-keys-deep';
import appHelper from 'app/pages/app/app.helper';

import { appLocaleType, appSizeType } from 'app/pages/app/app.types';
import locationShape from 'tools/prop-types/location-shape';

import DiscoverSidebar from 'app/components/discover-sidebar';

import Art, { artPropTypes } from 'app/ui/art';
import Header from 'app/ui/header';

import HelmetDisplayer from './components/helmet-displayer';

import './page.styl';
import Sidebar from '../sidebar';

const hoc = compose(
  withRouter,
  connect((state) => ({
    size: state.app.size,
    locale: state.app.locale,
  })),
  onlyUpdateForKeysDeep([
    'children',
    'prechildren',
    'helmet.title',
    'art.image.path',
    'art.image.color',
    'art.ugly',
    'art.height',
    'art.bottomHeight',
    'size',
    'sidebarProperties.onlyOnPhone',
  ]),
);

export const pagePropTypes = {
  children: PropTypes.oneOfType([PropTypes.shape(), PropTypes.array]).isRequired,
  prechildren: PropTypes.oneOfType([PropTypes.shape(), PropTypes.array]),
  helmet: PropTypes.shape({
    title: PropTypes.string,
    link: PropTypes.array,
    meta: PropTypes.array,
  }),
  className: PropTypes.string,
  header: PropTypes.shape(),
  art: PropTypes.oneOfType([PropTypes.bool, PropTypes.shape(artPropTypes)]),
  size: appSizeType.isRequired,
  locale: appLocaleType.isRequired,
  location: locationShape.isRequired,
  sidebarProperties: PropTypes.shape(),
  attrs: PropTypes.shape(),
  aboveHeader: PropTypes.oneOfType([PropTypes.node, PropTypes.func, PropTypes.array]),
  dispatch: PropTypes.func.isRequired,
  withSidebar: PropTypes.bool,
};

const defaultProps = {
  helmet: {},
  className: '',
  header: {},
  art: undefined,
  attrs: undefined,
  aboveHeader: undefined,
  sidebarProperties: undefined,
  withSidebar: true,
};

const PageComponent = ({
  helmet,
  className,
  prechildren,
  art,
  size,
  header: { display = true, ...headerProperties },
  children,
  attrs,
  aboveHeader,
  dispatch,
  locale,
  location,
  sidebarProperties,
  withSidebar,
}) => {
  const sidebarPropertiesFinal = {
    onlyOnPhone: true,
    ...sidebarProperties,
  };

  const isFullGame = location.pathname.endsWith('/full');

  const withSidebarClass = sidebarPropertiesFinal.onlyOnPhone === false;
  const withSidebarClassString = 'with-sidebar';
  const contentWrap = useRef(null);

  useEffect(() => {
    if (withSidebarClass) {
      contentWrap.current.classList.add(withSidebarClassString);
    } else {
      contentWrap.current.classList.remove(withSidebarClassString);
    }
  }, []);

  if (isFullGame) {
    return (
      <div {...attrs} ref={contentWrap}>
        {children}
      </div>
    );
  }

  return (
    <div {...attrs} className={cn('page', className)}>
      <HelmetDisplayer location={location} locale={locale} dispatch={dispatch} {...helmet} />
      {typeof aboveHeader === 'function' && aboveHeader()}
      {typeof aboveHeader === 'object' && aboveHeader}

      {display && appHelper.isPhoneSize(size) && (
        <Header className="page__header" pathname={location.pathname} {...headerProperties} />
      )}
      <div className="page__content-wrap-centerer">
        {appHelper.isPhoneSize(size) && prechildren}

        <div
          ref={contentWrap}
          className={cn('page__content-wrap', {
            [withSidebarClassString]: withSidebarClass,
          })}
        >
          {/* {withSidebar && (
            <DiscoverSidebar
              pathname={location.pathname}
              isPhoneSize={appHelper.isPhoneSize(size)}
              {...sidebarPropertiesFinal}
            />
          )} */}

          <div className="page__content-before">
            {display && appHelper.isDesktopSize(size) && (
              <Header className="page__header" pathname={location.pathname} {...headerProperties} />
            )}

            {appHelper.isDesktopSize(size) && prechildren}
            <main className="page__content">{children}</main>
          </div>
        </div>
      </div>
      <div className="page__art">{art && <Art size={size} {...art} />}</div>
    </div>
  );
};

PageComponent.propTypes = pagePropTypes;
PageComponent.defaultProps = defaultProps;

const Page = hoc(PageComponent);

export default Page;
