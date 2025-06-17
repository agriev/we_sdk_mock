import React, { Component } from 'react';
import PropTypes from 'prop-types';

import throttle from 'lodash/throttle';

import '../../groups.styl';

const GROUP_WIDTH = 86;
const GROUP_OFFSET = 35;

const propTypes = {
  groups: PropTypes.node.isRequired,
  register: PropTypes.node,
  playingGroup: PropTypes.number.isRequired,
  loadGroups: PropTypes.func.isRequired,
  showGroupName: PropTypes.func.isRequired,
};

const defaultProps = {
  register: null,
};

class GroupsMobile extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.infoGroups = React.createRef();
  }

  componentDidUpdate(previousProperties) {
    if (previousProperties.playingGroup !== this.props.playingGroup) {
      this.scrollToGroup();
      this.props.showGroupName();
    }
  }

  onGroupScroll = throttle(
    (event) => {
      const { groups, loadGroups } = this.props;

      if (event.target.scrollLeft + event.target.clientWidth >= (groups.length - 3) * GROUP_WIDTH) {
        loadGroups();
      }
    },
    100,
    { trailing: false },
  );

  scrollToGroup() {
    const { playingGroup } = this.props;
    const infoGroups = this.infoGroups.current;

    if (infoGroups) {
      infoGroups.scrollTo((playingGroup - 1) * (GROUP_WIDTH + GROUP_OFFSET), 0);
    }
  }

  render() {
    const { groups, register } = this.props;

    return (
      <div className="stories__groups__wrapper">
        <div className="stories__groups__block" ref={this.infoGroups} onScroll={this.onGroupScroll}>
          {groups}
          {register}
        </div>
      </div>
    );
  }
}

export default GroupsMobile;
