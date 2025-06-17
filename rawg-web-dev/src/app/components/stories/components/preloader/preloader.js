/* eslint-disable react/prefer-stateless-function */

import React from 'react';
import PropTypes from 'prop-types';

import evolve from 'ramda/src/evolve';
import assoc from 'ramda/src/assoc';
import pipe from 'ramda/src/pipe';

import { groupsType } from 'app/components/stories/stories.types';

/**
 * Компонент, который сейчас не используется в плеере, но это как вариант
 * решения предзагрузки видеороликов: добавлять их в общий пул предзагруженных видео.
 */
class StoriesPreloader extends React.Component {
  static propTypes = {
    groups: groupsType.isRequired,
    playingGroup: PropTypes.number.isRequired,
    playingVideo: PropTypes.number.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      preloads: {},
    };
  }

  componentDidMount() {
    this.addPreloads();
  }

  static getDerivedStateFromProps(props, state) {
    const { groups, playingGroup, playingVideo } = props;
    const { preloads } = state;
    const currentVideo = groups[playingGroup].videos[playingVideo];

    if (currentVideo) {
      if (preloads[currentVideo.url] === undefined) {
        preloads[currentVideo.url] = true;
      }

      const nextVideo = groups[playingGroup].videos[playingVideo + 1];

      if (nextVideo && preloads[nextVideo.url] === undefined) {
        preloads[nextVideo.url] = true;
      }

      if (Object.keys(preloads).length > 0) {
        return {
          preloads,
        };
      }
    }

    return null;
  }

  addPreloads = () => {
    const { groups, playingGroup, playingVideo } = this.props;
    const { preloads } = this.state;
    const currentVideo = groups[playingGroup].videos[playingVideo];
    const newPreloads = [];

    if (currentVideo && preloads[currentVideo.url] === undefined) {
      newPreloads.push(assoc(currentVideo.url, true));
    }

    const nextVideo = groups[playingGroup].videos[playingVideo + 1];

    if (nextVideo && preloads[nextVideo.url] === undefined) {
      newPreloads.push(assoc(nextVideo.url, true));
    }

    if (newPreloads.length > 0) {
      this.setState(
        evolve({
          preloads: pipe(...newPreloads),
        }),
      );
    }
  };

  render() {
    const { preloads } = this.state;
    return (
      <div className="stories__preloads">
        {Object.keys(preloads).map((file) => (
          <link key={file} rel="preload" as="video" href={file} />
        ))}
      </div>
    );
  }
}

export default StoriesPreloader;
