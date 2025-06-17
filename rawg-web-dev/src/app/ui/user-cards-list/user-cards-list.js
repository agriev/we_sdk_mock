import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import './user-cards-list.styl';

export default class UserCardsList extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    children: PropTypes.node.isRequired,
  };

  static defaultProps = {
    className: '',
  };

  getClassName() {
    const { className } = this.props;

    return classnames('user-cards-list', {
      [className]: className,
    });
  }

  render() {
    return <div className={this.getClassName()}>{this.props.children}</div>;
  }
}
