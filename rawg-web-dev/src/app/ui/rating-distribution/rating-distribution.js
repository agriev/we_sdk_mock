/* eslint-disable camelcase */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { FormattedMessage } from 'react-intl';

import Rating from 'app/ui/rating';

import './rating-distribution.styl';

export default class RatingDistribution extends PureComponent {
  static propTypes = {
    className: PropTypes.string,
    allRatings: PropTypes.arrayOf(PropTypes.object),
    ratings: PropTypes.arrayOf(PropTypes.object),
    isStat: PropTypes.bool,
    onRatingClick: PropTypes.func,
    user_review: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  };

  static defaultProps = {
    className: '',
    allRatings: [],
    ratings: [],
    isStat: true,
    onRatingClick: () => {},
    user_review: undefined,
  };

  constructor(props) {
    super(props);

    this.statsRefs = [];
    this.labelsRefs = [];
  }

  customMouseEnter = (kind, index) => {
    const labelReference = this.labelsRefs[index];
    const statsReference = this.statsRefs[index];

    switch (kind) {
      case 'stats':
        if (labelReference) {
          labelReference.classList.add('rating-distribution__label_hover');
        }
        return null;
      case 'labels':
        if (statsReference) {
          statsReference.classList.add('rating-distribution__stat-item_hover');
        }
        return null;
      default:
        return null;
    }
  };

  customMouseLeave = (kind, index) => {
    const labelReference = this.labelsRefs[index];
    const statsReference = this.statsRefs[index];

    switch (kind) {
      case 'stats':
        if (labelReference) {
          labelReference.classList.remove('rating-distribution__label_hover');
        }
        return null;
      case 'labels':
        if (statsReference) {
          statsReference.classList.remove('rating-distribution__stat-item_hover');
        }
        return null;
      default:
        return null;
    }
  };

  renderStatisticsItem = (rating, index) => {
    const { onRatingClick, allRatings } = this.props;
    const statProperties = {
      className: `rating-distribution__stat-item rating-distribution__stat-item_${rating.title}`,
      key: rating.id,
      ref: (reference) => {
        this.statsRefs.push(reference);
      },
      onMouseEnter: () => {
        this.customMouseEnter('stats', index);
      },
      onMouseLeave: () => {
        this.customMouseLeave('stats', index);
      },
      onClick: () => onRatingClick(rating),
      style: { width: `${Math.round(5.28 * rating.percent)}px` },
      role: 'button',
      tabIndex: 0,
    };

    return (
      <div {...statProperties}>
        {rating.percent >= 15 && (
          <Rating
            className="rating-distribution__stat-item-icon"
            rating={rating}
            allRatings={allRatings}
            kind="emoji"
          />
        )}
      </div>
    );
  };

  renderRatingLabel(rating) {
    const { onRatingClick, allRatings } = this.props;

    return (
      <>
        <div className={`rating-distribution__label-icon rating-distribution__label-icon_${rating.title}`} />
        <Rating
          className="rating-distribution__label-rating"
          rating={rating}
          allRatings={allRatings}
          kind="text"
          isIcon={false}
          onClick={onRatingClick}
        />
        {rating.count > 0 && <div className="rating-distribution__label-count">{rating.count}</div>}
      </>
    );
  }

  renderRating = (rating, index) => {
    const { user_review, onRatingClick } = this.props;
    const className = cn('rating-distribution__label', {
      'rating-distribution__label_active': user_review && rating.id === user_review.rating,
    });
    const labelProperties = {
      className,
      key: rating.id,
      ref: (reference) => {
        this.labelsRefs.push(reference);
      },
      onMouseEnter: () => {
        this.customMouseEnter('labels', index);
      },
      onMouseLeave: () => {
        this.customMouseLeave('labels', index);
      },
      onClick: () => onRatingClick(rating),
      role: 'button',
      tabIndex: 0,
    };

    return <div {...labelProperties}>{this.renderRatingLabel(rating, index)}</div>;
  };

  renderAddRating = (rating, index) => (
    <div className="rating-distribution__label rating-distribution__label_disabled" key={rating.id}>
      {this.renderRatingLabel(rating, index)}
    </div>
  );

  render() {
    const { className, allRatings, ratings, isStat } = this.props;

    const sortedRatings = allRatings.reduce((list, rating) => {
      const gameRating = ratings.find((r) => r.id === rating.id);
      if (gameRating) {
        list.push(gameRating);
      }
      return list;
    }, []);

    const addRatings = allRatings.filter((r) => !ratings.map((rd) => rd.id).includes(r.id));

    return (
      <div className={['rating-distribution', className].join(' ')}>
        {ratings.length > 0 && isStat ? (
          <div className="rating-distribution__stat">{sortedRatings.map(this.renderStatisticsItem)}</div>
        ) : (
          <div className="rating-distribution__stat_empty">
            <span className="rating-distribution__stat-icon_empty" role="img" aria-label="Empty" />
            <FormattedMessage id="game.ratings_empty" />
          </div>
        )}
        <div className="rating-distribution__meta">
          <div className="rating-distribution__labels">
            {sortedRatings.map(this.renderRating)}
            {addRatings.map(this.renderAddRating)}
          </div>
        </div>
      </div>
    );
  }
}
