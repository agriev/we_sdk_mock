import React, { Component } from 'react';
import PropTypes from 'prop-types';
import throttle from 'lodash/throttle';

import appHelper from 'app/pages/app/app.helper';

import { calcDiscoveryLayout, getContainerStyle } from 'app/components/discover-columns/discover-columns.helpers';

import CatalogHeading from 'app/ui/catalog-heading';

import './section-wrapper.styl';

const propTypes = {
  section: PropTypes.shape({
    name: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    items: PropTypes.array.isRequired,
  }).isRequired,
  appSize: PropTypes.string.isRequired,
};

class SectionWrapper extends Component {
  static propTypes = propTypes;

  calcLayout = throttle(() => {
    this.setState({ layout: calcDiscoveryLayout() });
  }, 100);

  constructor(...arguments_) {
    super(...arguments_);

    this.state = {
      layout: calcDiscoveryLayout(1024),
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.calcLayout);

    this.setState({ layout: calcDiscoveryLayout() });
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.calcLayout);
  }

  render() {
    const { appSize, section } = this.props;
    const { name, path, count, items } = section;
    const {
      layout: { columns, width },
    } = this.state;

    if (items.length === 0) return null;

    const style = getContainerStyle({ columns, containerWidth: width });
    const renderingItems = appHelper.isDesktopSize({ size: appSize }) ? items.slice(0, columns) : items;

    return (
      <section className="section-wrapper">
        <CatalogHeading heading={name} path={path} count={count} />
        <div className="section-wrapper__items" style={style}>
          {renderingItems.map((item, index) => (
            <div className="section-wrapper__card-wrapper" key={item.id || index}>
              {item}
            </div>
          ))}
        </div>
      </section>
    );
  }
}

export default SectionWrapper;
