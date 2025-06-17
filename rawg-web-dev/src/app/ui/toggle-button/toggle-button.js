import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import cn from 'classnames';

import './toggle-button.styl';

const toggleButtonPropertyTypes = {
  text: PropTypes.node.isRequired,
  enabled: PropTypes.bool,
  onChange: PropTypes.func,
  className: PropTypes.string,
  url: PropTypes.string,
};

const defaultProps = {
  enabled: false,
  onChange: undefined,
  className: '',
  url: undefined,
};

export default class ToggleButton extends Component {
  static propTypes = toggleButtonPropertyTypes;

  static defaultProps = defaultProps;

  handleChange = () => {
    const { onChange } = this.props;

    if (typeof onChange === 'function') {
      onChange();
    }
  };

  render() {
    const { enabled, className, text, url } = this.props;

    return (
      <div className={cn('toggle-button-wrapper', className, { enabled })}>
        <span className="toggle-button__text">{text}</span>
        {!url && (
          <div className="toggle-button" onClick={this.handleChange} role="button" tabIndex={0}>
            <div className="toggle-button__inner" />
          </div>
        )}
        {url && (
          <Link className="toggle-button" to={url}>
            <div className="toggle-button__inner" />
          </Link>
        )}
      </div>
    );
  }
}
