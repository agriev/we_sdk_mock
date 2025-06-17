import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import './comments-list.styl';

const commentsListPropertyTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
  useId: PropTypes.bool,
};

const defaultProps = {
  className: '',
  children: undefined,
  useId: false,
};

export default class CommentsList extends Component {
  static propTypes = commentsListPropertyTypes;

  static defaultProps = defaultProps;

  get className() {
    const { className } = this.props;

    return classnames('comments-list', {
      [className]: className,
    });
  }

  render() {
    const { useId } = this.props;

    return useId ? (
      <div id="comments" className={this.className}>
        {this.props.children}
      </div>
    ) : (
      <div className={this.className}>{this.props.children}</div>
    );
  }
}
