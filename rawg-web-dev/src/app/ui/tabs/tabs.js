import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import './tabs.styl';

const tabsPropertyTypes = {
  disabled: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]).isRequired,
  centred: PropTypes.bool,
  onlyMobileCentred: PropTypes.bool,
};

const defaultProps = {
  disabled: false,
  className: '',
  centred: true,
  onlyMobileCentred: false,
};

export default class Tabs extends Component {
  static propTypes = tabsPropertyTypes;

  static defaultProps = defaultProps;

  get className() {
    const { className, disabled, centred, onlyMobileCentred } = this.props;

    return classnames('tabs', {
      tabs_disabled: disabled,
      tabs_centred: centred,
      'tabs_mobile-centred': onlyMobileCentred,
      [className]: className,
    });
  }

  render() {
    /* eslint-disable react/no-array-index-key */
    return (
      <nav className={this.className}>
        <ul className="tabs__list">
          {this.props.children.map((element, idx) => (
            <li className="tabs__item" key={idx}>
              {element}
            </li>
          ))}
        </ul>
      </nav>
    );
  }
}
