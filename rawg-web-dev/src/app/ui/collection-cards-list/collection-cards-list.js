import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';

import evolve from 'ramda/src/evolve';
import inc from 'ramda/src/inc';

import appHelper from 'app/pages/app/app.helper';
import Slider from 'app/ui/slider';
import SliderArrow from 'app/ui/slider-arrow';
import CollectionCard from 'app/ui/collection-card-new';
import { appSizeType } from 'app/pages/app/app.types';

import './collection-cards-list.styl';

const isEven = (n) => n % 2 === 0;

const isOdd = (n) => Math.abs(n % 2) === 1;

@connect((state) => ({
  size: state.app.size,
}))
export default class CollectionCardsList extends Component {
  static propTypes = {
    collections: PropTypes.arrayOf(PropTypes.shape()),
    kind: PropTypes.oneOf(['common', 'slider']),
    className: PropTypes.string,
    children: PropTypes.node,
    size: appSizeType.isRequired,
  };

  static defaultProps = {
    kind: undefined,
    children: undefined,
    collections: undefined,
    className: '',
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      step: 1,
    };
  }

  getClassName() {
    const { className, kind = 'common' } = this.props;

    return classnames('collection-cards-list', {
      [`collection-cards-list_${kind}`]: kind,
      [className]: className,
    });
  }

  moreCollections = () => {
    this.setState(evolve({ step: inc }));
  };

  renderTiles() {
    const { collections, size } = this.props;
    const isDesktop = appHelper.isDesktopSize({ size });
    return (
      <div>
        <div className={classnames(this.getClassName(), 'collection-cards-list__tiles')}>
          <div>
            {collections.map(
              (collection, colIndex) =>
                (!isDesktop || isEven(colIndex)) && (
                  <div className="collection-cards-list__tiles__tile" key={collection.id}>
                    <CollectionCard size={size} collection={collection} />
                  </div>
                ),
            )}
          </div>
          {isDesktop && (
            <div className="collection-cards-list__tiles__tile__right__column">
              {collections.map(
                (collection, colIndex) =>
                  isOdd(colIndex) && (
                    <div className="collection-cards-list__tiles__tile" key={collection.id}>
                      <CollectionCard size={size} collection={collection} />
                    </div>
                  ),
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  renderSlider(step) {
    const { collections, size } = this.props;

    const nextArrow = <SliderArrow arrowClassName="collection-cards-list__slider-arrow" direction="next" />;

    const prevArrow = <SliderArrow arrowClassName="collection-cards-list__slider-arrow" direction="prev" />;

    return (
      <div className={this.getClassName()}>
        <Slider
          arrows={appHelper.isDesktopSize({ size }) && collections.length > 3}
          nextArrow={nextArrow}
          prevArrow={prevArrow}
          adaptiveHeight={false}
          dots={appHelper.isPhoneSize({ size })}
          variableWidth
          infinite={appHelper.isDesktopSize({ size }) && collections.length > 3}
          slidesToScroll={appHelper.isDesktopSize({ size }) ? 3 : 1}
          slidesToShow={1}
          centerView
        >
          {collections.slice(0, step * 4).map((collection) => (
            <div className="collection-cards-list__slide" key={collection.id}>
              <CollectionCard size={size} collection={collection} />
            </div>
          ))}
          {step * 4 <= collections.length && (
            <div className="collections-cards-list__button_slide">
              <div className="collections-cards-list__button_container">
                <div
                  className="collection-cards-list__button"
                  onClick={this.moreCollections}
                  role="button"
                  tabIndex={0}
                >
                  More
                </div>
              </div>
            </div>
          )}
        </Slider>
      </div>
    );
  }

  render() {
    const { kind } = this.props;

    switch (kind) {
      case 'slider':
        return this.renderSlider(this.state.step);

      case 'common':
        return this.renderTiles(this.state.step);

      default:
        return <div className={this.getClassName()}>{this.props.children}</div>;
    }
  }
}
