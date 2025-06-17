import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { connect } from 'react-redux';

import { appSizeType } from 'app/pages/app/app.types';

import HideOnScroll from 'app/render-props/hide-on-scroll';
import LoadMore from 'app/ui/load-more';

import Paginator from './components/paginator';

const hoc = compose(
  connect((state) => ({
    appSize: state.app.size,
  })),
);

const propTypes = {
  pages: PropTypes.number.isRequired,
  getPaginatorHref: PropTypes.func,
  appSize: appSizeType.isRequired,
  showSeoPagination: PropTypes.bool,

  // пропсы для LoadMore
  className: PropTypes.string,
  load: PropTypes.func,
  next: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.object]),
  loading: PropTypes.bool,
  isOnScroll: PropTypes.bool,
  count: PropTypes.number,
  loadIconSize: PropTypes.string,
  needLoadOnScroll: PropTypes.func,
  children: PropTypes.oneOfType([PropTypes.array, PropTypes.node]).isRequired,
};

const defaultProps = {
  showSeoPagination: true,
  className: undefined,
  load: undefined,
  loading: undefined,
  isOnScroll: undefined,
  count: undefined,
  loadIconSize: undefined,
  needLoadOnScroll: undefined,
  next: null,
  getPaginatorHref: undefined,
};

const ListLoaderComponent = ({
  showSeoPagination,
  className,
  next,
  getPaginatorHref,
  pages,
  load,
  loading,
  isOnScroll,
  count,
  loadIconSize,
  needLoadOnScroll,
  children,
  appSize,
}) => {
  const paginator = showSeoPagination && (
    <HideOnScroll>
      {(isActive) => <Paginator next={next} getHref={getPaginatorHref} pages={pages} hidden={!isActive || loading} />}
    </HideOnScroll>
  );

  return (
    <div className={className}>
      <LoadMore
        appSize={appSize}
        load={load}
        next={next}
        loading={loading}
        isOnScroll={isOnScroll}
        count={count}
        loadIconSize={loadIconSize}
        needLoadOnScroll={needLoadOnScroll}
      >
        {children}
      </LoadMore>
      {paginator}
    </div>
  );
};

ListLoaderComponent.propTypes = propTypes;
ListLoaderComponent.defaultProps = defaultProps;

const ListLoader = hoc(ListLoaderComponent);

export default ListLoader;
