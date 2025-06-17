import React from 'react';
import { Link } from 'app/components/link';
import PropTypes from 'prop-types';
import cn from 'classnames';

import appHelper from 'app/pages/app/app.helper';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import Slider from 'app/ui/slider';
import SliderArrow from 'app/ui/slider-arrow';

import './catalog-slider.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  size: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  openMorePath: PropTypes.string,
  saveHeightOnHover: PropTypes.bool,
};

const defaultProps = {
  className: '',
  openMorePath: undefined,
  saveHeightOnHover: false,
};

class CatalogSlider extends React.Component {
  constructor(...arguments_) {
    super(...arguments_);

    this.containerRef = React.createRef();

    this.state = {
      expanded: false,
    };
  }

  render() {
    const { expanded } = this.state;
    const { className, size, children, openMorePath, saveHeightOnHover } = this.props;

    const isDesktop = appHelper.isDesktopSize({ size });
    const isPhone = appHelper.isPhoneSize({ size });
    const sliderClass = cn('catalog-slider', { [className]: !!className, expanded });

    return (
      <div className={sliderClass} ref={this.containerRef}>
        <Slider
          arrows={isDesktop && children.length > 3}
          nextArrow={<SliderArrow direction="next" />}
          prevArrow={<SliderArrow direction="prev" />}
          adaptiveHeight={false}
          variableWidth
          infinite={children.length > 3}
          slidesToScroll={isDesktop ? 3 : 1}
          swipeToSlide
          standard={isPhone}
          saveHeightOnHover={saveHeightOnHover}
        >
          {children}
          {openMorePath && (
            <div>
              <Link className="catalog-slider__more-link" to={openMorePath} href={openMorePath}>
                <div className="catalog-slider__more-button">
                  <SimpleIntlMessage id="shared.open_more" />
                </div>
              </Link>
            </div>
          )}
        </Slider>
      </div>
    );
  }
}

CatalogSlider.propTypes = componentPropertyTypes;
CatalogSlider.defaultProps = defaultProps;

export default CatalogSlider;
