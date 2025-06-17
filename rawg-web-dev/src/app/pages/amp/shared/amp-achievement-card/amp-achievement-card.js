import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

export default class AchievementCard extends Component {
  static propTypes = {
    achievement: PropTypes.shape().isRequired,
    className: PropTypes.string,
  };

  static defaultProps = {
    className: '',
  };

  get className() {
    const { className } = this.props;

    return classnames('achievement-card', {
      [className]: className,
    });
  }

  render() {
    const { achievement } = this.props;
    const { name, description, image, percent } = achievement;

    return (
      <div className={this.className}>
        <div className="achievement-card__img">
          <amp-img src={image} layout="fill" />
        </div>
        <div className="achievement-card__meta">
          <div className="achievement-card__percent">{percent}%</div>
          <div className="achievement-card__title">{name}</div>
          <div className="achievement-card__description">{description}</div>
        </div>
      </div>
    );
  }
}
