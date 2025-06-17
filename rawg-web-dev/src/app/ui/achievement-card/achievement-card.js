import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import memoizeOne from 'memoize-one';

import crop from 'tools/img/crop';

import './achievement-card.styl';
import RenderMounted from 'app/render-props/render-mounted';

export default class AchievementCard extends Component {
  static propTypes = {
    achievement: PropTypes.shape().isRequired,
    className: PropTypes.string,
  };

  static defaultProps = {
    className: '',
  };

  getClassName() {
    const { className } = this.props;

    return classnames('achievement-card', {
      [className]: className,
    });
  }

  getBackground = memoizeOne(({ visible, image }) => {
    if (visible && image) {
      return {
        backgroundImage: `url(${crop(96, image)})`,
      };
    }

    return undefined;
  });

  render() {
    const { achievement } = this.props;
    const { name, description, image, percent } = achievement;

    return (
      <RenderMounted>
        {({ visible, onChildReference }) => (
          <div ref={(element) => onChildReference(element)} className={this.getClassName()}>
            <div className="achievement-card__image" style={this.getBackground({ visible, image })} />
            <div className="achievement-card__meta">
              <div className="achievement-card__percent">{percent}%</div>
              <div className="achievement-card__title">{name}</div>
              <div className="achievement-card__description">{description}</div>
            </div>
          </div>
        )}
      </RenderMounted>
    );
  }
}
