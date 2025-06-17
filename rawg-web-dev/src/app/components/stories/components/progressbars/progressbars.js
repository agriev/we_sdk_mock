/* eslint-disable react/no-array-index-key */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import pipe from 'ramda/src/pipe';
import evolve from 'ramda/src/evolve';

import { headerVisible as headerVisibleType } from 'app/pages/app/app.types';

import './progressbars.styl';

const propTypes = {
  playingVideo: PropTypes.number.isRequired,
  onClickOnBar: PropTypes.func.isRequired,
  headerVisible: headerVisibleType.isRequired,
};

class StoriesProgressBars extends React.Component {
  static propTypes = propTypes;

  constructor(properties, context) {
    super(properties, context);

    this.state = {
      bars: [],
    };
  }

  setBars = (bars) => {
    this.setState({ bars });
  };

  updateBars = (updates) => {
    this.setState(
      evolve({
        bars: pipe(...updates),
      }),
    );
  };

  render() {
    const { bars } = this.state;
    const { playingVideo, onClickOnBar, headerVisible } = this.props;

    return (
      <div className={cn('stories__progresses-wrap', { active: headerVisible })}>
        <div className="stories__progresses">
          {bars.map((bar, idx) => (
            <div
              key={idx}
              className="stories__progress-wrap"
              onClick={() => onClickOnBar(idx)}
              role="button"
              tabIndex={0}
            >
              <div
                className={cn('stories__progress', {
                  stories__group_active: idx === playingVideo,
                })}
              >
                <div className="stories__progress-fill" style={{ width: `${bar}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export default StoriesProgressBars;
