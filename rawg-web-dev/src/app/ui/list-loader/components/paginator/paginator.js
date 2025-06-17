import React from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { stringify } from 'qs';
import { compose } from 'recompose';
import cn from 'classnames';

import range from 'ramda/src/range';

import './paginator.styl';

const hoc = compose(withRouter);

const propTypes = {
  pages: PropTypes.number.isRequired,
  maxRangeLength: PropTypes.number,
  next: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  hidden: PropTypes.bool,

  getHref: PropTypes.func,
};

const defaultProps = {
  maxRangeLength: 5,
  next: null,
  hidden: false,

  getHref: (page, query = {}, pathname = window.location.pathname) => {
    const stringifiedQuery = stringify({
      ...query,
      page: page > 1 ? page : undefined,
    });

    return stringifiedQuery ? `?${stringifiedQuery}` : pathname;
  },
};

const PaginatorComponent = ({ pages, maxRangeLength, getHref, next, hidden, location: { query, pathname } }) => {
  const currentPage = next ? next - 1 : pages;

  const headRange = range(1, Math.min(maxRangeLength + 1, pages + 1));
  const midRange = range(currentPage - 1, Math.min(currentPage + 2, pages + 1));
  const linksRange = currentPage < maxRangeLength ? headRange : midRange;

  const elipsis = (
    <span className="paginator__ellipsis" key="elipsis">
      ...
    </span>
  );

  const renderLink = (pageNumber, isActive, isDisabled) =>
    isActive ? (
      <div
        className={cn('paginator__link', 'paginator__link_active', {
          paginator__link_disabled: isDisabled,
        })}
        key={pageNumber}
      >
        {pageNumber}
      </div>
    ) : (
      <a
        className={cn('paginator__link', {
          paginator__link_disabled: isDisabled,
        })}
        href={getHref(pageNumber, query, pathname)}
        key={pageNumber}
      >
        {pageNumber}
      </a>
    );

  const maybeFirstPage = currentPage >= maxRangeLength && [renderLink(1), elipsis];

  const maybeLastPage = pages > maxRangeLength &&
    currentPage < pages - 1 && [elipsis, renderLink(pages, currentPage === pages, currentPage < pages - 1)];

  const renderNavigationButton = (content, pageNumber, visible) =>
    visible && (
      <a className="paginator__link" href={getHref(pageNumber, query, pathname)}>
        {content}
      </a>
    );

  const goToPrevious = renderNavigationButton('<', currentPage - 1, currentPage > 1);
  const goToNext = renderNavigationButton('>', next, !!next);

  return (
    pages > 1 && (
      <div className={cn('paginator', { hidden })}>
        {goToPrevious}
        {maybeFirstPage}
        {linksRange.map((number) => renderLink(number, currentPage === number))}
        {maybeLastPage}
        {goToNext}
      </div>
    )
  );
};

PaginatorComponent.defaultProps = defaultProps;
PaginatorComponent.propTypes = propTypes;

const Paginator = hoc(PaginatorComponent);

export default Paginator;
