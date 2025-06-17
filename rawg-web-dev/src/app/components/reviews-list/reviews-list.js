import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import ListLoader from 'app/ui/list-loader';

import appHelper from 'app/pages/app/app.helper';

import './reviews-list.styl';

import {
  MODE_SELECTOR_LIST,
  MODE_SELECTOR_COLUMNS,
  modeSelectorType,
} from 'app/components/mode-selector/mode-selector.helper';
import { appSizeType } from 'app/pages/app/app.types';

import ReviewCard from 'app/components/review-card';
import DiscoverColumns from 'app/components/discover-columns/discover-columns';
import passDownProps from 'tools/pass-down-props';
import gameType from 'app/pages/game/game.types';

const propTypes = {
  game: gameType,
  className: PropTypes.string,
  displayMode: modeSelectorType,
  appSize: appSizeType.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  load: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  count: PropTypes.number,
  next: PropTypes.number,
  pages: PropTypes.number,
  reviewCardProps: PropTypes.oneOfType([PropTypes.shape(), PropTypes.func]),
  showSeoPagination: PropTypes.bool,
};

const defaultProps = {
  game: undefined,
  className: undefined,
  displayMode: MODE_SELECTOR_LIST,
  count: undefined,
  next: undefined,
  pages: undefined,
  reviewCardProps: undefined,
  showSeoPagination: true,
};

const ReviewsList = ({
  game,
  className,
  reviewCardProps,
  displayMode,
  appSize,
  items,
  load,
  loading,
  count,
  next,
  pages,
  showSeoPagination,
}) => {
  const isDesktop = appHelper.isDesktopSize(appSize);
  const isPhone = appHelper.isPhoneSize(appSize);
  const showList = displayMode === MODE_SELECTOR_LIST;
  const showColumns = displayMode === MODE_SELECTOR_COLUMNS;
  const modeClass = showList ? 'reviews-list_list' : 'reviews-list_columns';

  const renderReview = (review) => (
    <ReviewCard
      className="reviews__review"
      game={game}
      review={review}
      showGameInfo
      showUserInfo
      showComments={isPhone || showList}
      showMenu={showList}
      key={review.id}
      textLines={isDesktop && showList ? 24 : undefined}
      textHeight={isPhone || showList ? 300 : undefined}
      truncateStyle={isPhone || showList ? 'height' : 'lines'}
      fullReviewLink={isDesktop && showColumns}
      acceptableTextLength={isDesktop && showList ? 1500 : undefined}
      {...passDownProps(reviewCardProps, review)}
    />
  );

  return (
    <ListLoader
      className={cn('reviews-list', modeClass, className)}
      load={load}
      count={count}
      next={next}
      loading={loading}
      pages={pages}
      showSeoPagination={showSeoPagination}
      isOnScroll
    >
      {showColumns && <DiscoverColumns items={items} renderItem={renderReview} />}
      {showList && items.map(renderReview)}
    </ListLoader>
  );
};

ReviewsList.propTypes = propTypes;
ReviewsList.defaultProps = defaultProps;

export default ReviewsList;
