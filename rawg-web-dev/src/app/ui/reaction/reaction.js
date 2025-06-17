import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import './reaction.styl';

export const reactionPropTypes = {
  reaction: PropTypes.shape({
    id: PropTypes.number,
    title: PropTypes.string,
  }).isRequired,
  kind: PropTypes.oneOf(['empty', 'button']),
  hover: PropTypes.bool,
  active: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
};

const defaultProps = {
  kind: undefined,
  hover: false,
  active: false,
  onClick: undefined,
  className: '',
};

export default class Reaction extends Component {
  static propTypes = reactionPropTypes;

  static defaultProps = defaultProps;

  getClassName() {
    const { className, hover, active, kind } = this.props;

    return classnames('reaction', {
      [`reaction_${kind}`]: kind,
      reaction_hover: hover,
      reaction_active: active,
      [className]: className,
    });
  }

  handleClick = (reaction) => {
    const { onClick } = this.props;

    if (typeof onClick === 'function') {
      onClick(reaction);
    }
  };

  render() {
    const { reaction } = this.props;
    const { title } = reaction;

    return (
      <div className={this.getClassName()} onClick={() => this.handleClick(reaction)} role="button" tabIndex={0}>
        «{title}»
      </div>
    );
  }
}
