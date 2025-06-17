import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import cn from 'classnames';

import appHelper from 'app/pages/app/app.helper';

import './truncate-block-by-height.styl';

import { appSizeType } from 'app/pages/app/app.types';

import { isNeedWrapper } from './truncate-block-by-height.helpers';

export const truncateBlockPropTypes = {
  desktop: PropTypes.bool,
  phone: PropTypes.bool,
  maxHeight: PropTypes.number,
  className: PropTypes.string,
  expandButtonClassNames: PropTypes.oneOfType([PropTypes.string, PropTypes.array, PropTypes.object]),
  size: appSizeType.isRequired,
  children: PropTypes.node.isRequired,
  length: PropTypes.number,
  onReadMoreClick: PropTypes.func,
};

const truncateBlockDefaultProperties = {
  className: '',
  expandButtonClassNames: '',
  maxHeight: undefined,
  phone: true,
  desktop: true,
  length: undefined,
  onReadMoreClick: undefined,
};

const DESKTOP_MAX_HEIGHT = 350;
const PHONE_MAX_HEIGHT = 250;

@hot
@connect((state) => ({
  size: state.app.size,
}))
export default class TruncateBlockByHeight extends Component {
  static propTypes = truncateBlockPropTypes;

  static defaultProps = truncateBlockDefaultProperties;

  constructor(props) {
    super(props);

    this.ref = {};
    this.state = {
      expanded: false,
    };
  }

  componentDidMount() {
    let { maxHeight } = this.props;
    const { size, length } = this.props;

    const blockHeight = !length || length >= 1300 ? this.ref.truncate.scrollHeight : undefined;

    maxHeight = maxHeight || (appHelper.isDesktopSize({ size }) ? DESKTOP_MAX_HEIGHT : PHONE_MAX_HEIGHT);

    if (blockHeight <= maxHeight) {
      this.setState({ expanded: true });
    }
  }

  getClassName() {
    const { className } = this.props;

    return cn('truncate-block', {
      'truncate-block_expanded': this.state.expanded,
      [className]: className,
    });
  }

  getWrapperClassName() {
    const { desktop, phone } = this.props;

    return cn('truncate-block__wrapper', {
      'truncate-block__wrapper_desktop': desktop,
      'truncate-block__wrapper_phone': phone,
    });
  }

  toggle = () => {
    if (this.props.onReadMoreClick) {
      this.props.onReadMoreClick();
    } else {
      this.setState(({ expanded }) => ({ expanded: !expanded }));
    }
  };

  renderWrapper = () => {
    const { size, maxHeight } = this.props;
    return (
      <div
        className={this.getWrapperClassName()}
        style={{
          maxHeight: maxHeight || (appHelper.isDesktopSize({ size }) ? DESKTOP_MAX_HEIGHT : PHONE_MAX_HEIGHT),
        }}
        ref={(reference) => {
          this.ref.truncate = reference;
        }}
      >
        {this.props.children}
      </div>
    );
  };

  render() {
    const { expanded } = this.state;
    const { expandButtonClassNames, length } = this.props;
    const needWrapper = isNeedWrapper(length);

    return (
      <div className={this.getClassName()}>
        {needWrapper && !expanded && this.renderWrapper()}
        {(!needWrapper || expanded) && this.props.children}
        {needWrapper && (
          <div
            className={cn('truncate-block__button', expandButtonClassNames)}
            onClick={this.toggle}
            role="button"
            tabIndex={0}
          >
            <FormattedMessage id={expanded ? 'shared.truncate_button_less' : 'shared.truncate_button'} />
          </div>
        )}
      </div>
    );
  }
}
