/* eslint-disable react/prefer-stateless-function */

import React from 'react';
import PropTypes from 'prop-types';

import { throwEvent } from 'scripts/analytics-helper';

// import { groupsType } from 'app/components/stories/stories.types';

class AnalyticsLogger extends React.Component {
  static propTypes = {
    // groups: groupsType.isRequired,
    playingGroup: PropTypes.number.isRequired,
    playingVideo: PropTypes.number.isRequired,
  };

  componentDidUpdate(previousProperties) {
    const { playingGroup, playingVideo } = this.props;

    if (playingGroup !== previousProperties.playingGroup) {
      throwEvent({ category: 'stories', action: 'start_story' });
      throwEvent({ category: 'stories', action: 'start_clip' });
    } else if (playingVideo !== previousProperties.playingVideo) {
      throwEvent({ category: 'stories', action: 'start_clip' });
    }
  }

  render() {
    return null;
  }
}

export default AnalyticsLogger;
