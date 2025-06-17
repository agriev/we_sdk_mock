import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import './heading.styl';

const propTypes = {
  // 1 - 72px, 2 - 44px, 3 - 36px, 4 - 24px, 5 - 18
  rank: PropTypes.oneOf([1, 2, 3, 4, 5]).isRequired,
  looksLike: PropTypes.oneOf([1, 2, 3, 4, 5]),
  children: PropTypes.node,
  disabled: PropTypes.bool,
  centred: PropTypes.bool,
  withMobileOffset: PropTypes.bool,
  className: PropTypes.string,
  itemProp: PropTypes.string,
};

const defaultProps = {
  itemProp: undefined,
  looksLike: undefined,
  children: null,
  disabled: false,
  centred: false,
  withMobileOffset: false,
  className: '',
};

export default class Heading extends PureComponent {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  render() {
    const { rank, looksLike, children, disabled, centred, className, withMobileOffset, itemProp } = this.props;

    const HeadingTag = disabled ? 'div' : `h${rank}`;
    const headingClass = cn('heading', `heading_${looksLike || rank}`, {
      heading_centred: centred,
      heading_offset: withMobileOffset,
      [className]: className,
    });

    return (
      <HeadingTag itemProp={itemProp} className={headingClass}>
        {children}
      </HeadingTag>
    );
  }
}
