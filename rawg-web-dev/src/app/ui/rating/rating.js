import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';
import cn from 'classnames';

import find from 'lodash/find';
import isPlainObject from 'lodash/isPlainObject';

import './rating.styl';

import Avatar from 'app/ui/avatar';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import RenderMounted from 'app/render-props/render-mounted';

export const ratingPropTypes = {
  allRatings: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      positive: PropTypes.bool.isRequired,
      title: PropTypes.string.isRequired,
    }),
  ).isRequired,
  rating: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.shape({
      id: PropTypes.number,
      title: PropTypes.oneOf(['skip', 'exceptional', 'meh', 'recommended']),
    }),
  ]),
  kind: PropTypes.oneOf(['emoji', 'button', 'text']),
  hover: PropTypes.bool,
  active: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
  gameOwner: PropTypes.shape(),
  isIcon: PropTypes.bool,
};

@hot
export default class Rating extends Component {
  static propTypes = ratingPropTypes;

  static defaultProps = {
    rating: undefined,
    kind: 'text',
    hover: false,
    active: false,
    onClick: undefined,
    className: '',
    gameOwner: undefined,
    isIcon: true,
  };

  getClassName(title) {
    const { className, hover, active, kind } = this.props;

    return cn('rating', {
      [`rating_${kind}`]: kind,
      [`rating_${title}`]: title,
      rating_hover: hover,
      rating_active: active,
      [className]: className,
    });
  }

  getRating = () => {
    const { allRatings, rating } = this.props;

    if (isPlainObject(rating) && rating.title) {
      return rating;
    }

    const id = isPlainObject(rating) ? rating.id : rating;

    return find(allRatings, { id });
  };

  handleClick = (rating) => {
    const { onClick } = this.props;

    if (typeof onClick === 'function') {
      onClick(rating);
    }
  };

  render() {
    const { kind, gameOwner, isIcon } = this.props;
    const rating = this.getRating();
    const { title } = rating || {};

    if (!title || !rating) {
      return null;
    }

    const avatar = typeof gameOwner === 'object' && (
      <Avatar className="rating__avatar" size={24} src={gameOwner.avatar} profile={gameOwner} />
    );

    return (
      <RenderMounted>
        {({ visible, onChildReference }) => (
          <div
            ref={(element) => onChildReference(element)}
            className={this.getClassName(title)}
            onClick={() => this.handleClick(rating)}
            title={title}
            role="button"
            tabIndex={0}
          >
            {isIcon && visible && <div className={`rating__icon rating__icon_${title}`} />}
            {kind === 'emoji' && visible && avatar}
            {kind !== 'emoji' && (
              <div className="rating__text">
                {avatar}
                <SimpleIntlMessage id={`shared.rating_${title}`} />
              </div>
            )}
          </div>
        )}
      </RenderMounted>
    );
  }
}
