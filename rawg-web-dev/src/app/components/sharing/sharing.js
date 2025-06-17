/* eslint-disable no-mixed-operators */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import getAppContainerWidth from 'tools/get-app-container-width';
import getAppContainerHeight from 'tools/get-app-container-height';

const WINDOW_WIDTH = 926;
const WINDOW_HEIGHT = 436;

export const sharingPropTypes = {
  url: PropTypes.string.isRequired,
  provider: PropTypes.oneOf(['vk', 'twitter']).isRequired,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};

const defaultProps = {
  className: '',
};

export default class Sharing extends Component {
  static propTypes = sharingPropTypes;

  static defaultProps = defaultProps;

  getShareUrl = () => {
    let { url } = this.props;
    const { provider } = this.props;

    url = decodeURIComponent(`${window.location.origin}${url}`);

    switch (provider) {
      case 'vk':
        return `https://vk.com/share.php?url=${url}`;
      case 'twitter':
        return `https://twitter.com/share?url=${url}`;
      default:
        return '';
    }
  };

  share = () => {
    const left = getAppContainerWidth() / 2 - WINDOW_WIDTH / 2 + window.screenX;
    const top = getAppContainerHeight() / 2 - WINDOW_HEIGHT / 2 + window.screenY;

    window.open(
      this.getShareUrl(),
      '',
      `toolbar=0,status=0,width=${WINDOW_WIDTH},height=${WINDOW_HEIGHT},top=${top},left=${left}`,
    );
  };

  render() {
    const { className = '' } = this.props;

    return (
      <div className={className} onClick={this.share} role="button" tabIndex={0}>
        {this.props.children}
      </div>
    );
  }
}
