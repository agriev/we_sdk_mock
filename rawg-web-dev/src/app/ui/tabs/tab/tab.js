import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link, withRouter } from 'react-router';
import cn from 'classnames';

import omit from 'lodash/omit';
import isUndefined from 'lodash/isUndefined';

import locationShape from 'tools/prop-types/location-shape';

import './tab.styl';

export const tabPropTypes = {
  size: PropTypes.oneOf(['small', 'medium']),
  active: PropTypes.bool,
  disabled: PropTypes.bool,
  to: PropTypes.string,
  counter: PropTypes.number,
  onClick: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node,
  isNoRel: PropTypes.bool,
  location: locationShape.isRequired,
};

const defaultProps = {
  size: undefined,
  active: false,
  disabled: false,
  to: undefined,
  counter: undefined,
  onClick: undefined,
  children: undefined,
  className: undefined,
  isNoRel: false,
};

@withRouter
export default class Tab extends Component {
  static propTypes = tabPropTypes;

  static defaultProps = defaultProps;

  getClassName = () => {
    const { size, disabled, active, className, location, to } = this.props;

    return cn('tab', {
      tab_disabled: disabled,
      tab_active: active,
      tab_samepage: location.pathname === to,
      [`tab_${size}`]: size,
      [className]: className,
    });
  };

  handleBlockClick = () => {
    const { onClick, disabled } = this.props;

    if (disabled) return;

    if (typeof onClick === 'function') {
      onClick();
    }
  };

  renderName = () => <span className="tab__name">{this.props.children}</span>;

  renderCounter = () => {
    const { counter } = this.props;

    if (isUndefined(counter)) return null;

    return <div className={cn('tab__counter', { tab__counter_empty: !counter })}>{counter || ''}</div>;
  };

  renderLink = () => {
    const { to, active, counter, isNoRel, location } = this.props;
    const linkProperties = {
      ...omit(this.props, ['active', 'className', 'isNoRel', 'location', 'router', 'params', 'routes']),
      to: {
        pathname: to,
        state: {
          ignoreScrollBehavior: true,
        },
      },
    };

    if (active && location.pathname === to) {
      return (
        <span className={this.getClassName()}>
          {this.renderName()}
          {this.renderCounter()}
        </span>
      );
    }

    return (
      <Link
        className={this.getClassName()}
        onlyActiveOnIndex
        {...linkProperties}
        rel={(!isNoRel && typeof counter === 'undefined') || counter === 0 ? 'nofollow' : undefined}
      >
        {this.renderName()}
        {this.renderCounter()}
      </Link>
    );
  };

  renderBlock = () => (
    <div className={this.getClassName()} onClick={this.handleBlockClick} role="button" tabIndex={0}>
      {this.renderName()}
      {this.renderCounter()}
    </div>
  );

  render = () => {
    const { to } = this.props;

    return to ? this.renderLink() : this.renderBlock();
  };
}
