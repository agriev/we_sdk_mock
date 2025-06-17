import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import './round-progressbar.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  squareSize: PropTypes.number,
  percent: PropTypes.number,
  strokeWidth: PropTypes.number,
  startColor: PropTypes.string,
  endColor: PropTypes.string,
};

const defaultProps = {
  className: '',
  squareSize: 61,
  percent: 25,
  strokeWidth: 7,
  startColor: '#fad961',
  endColor: '#f76b1c',
};

const RoundProgressbar = ({ className, squareSize, percent, strokeWidth, startColor, endColor }) => {
  // SVG centers the stroke width on the radius, subtract out so circle fits in square
  const radius = (squareSize - strokeWidth) / 2;
  // Enclose cicle in a circumscribing square
  const viewBox = `0 0 ${squareSize} ${squareSize}`;
  // Arc length at 100% coverage is the circle circumference
  const dashArray = radius * Math.PI * 2;
  // Scale 100% coverage overlay with the actual percent
  // eslint-disable-next-line no-mixed-operators
  const dashOffset = dashArray - (dashArray * percent) / 100;

  return (
    <svg width={squareSize} height={squareSize} viewBox={viewBox} className={cn('round-progressbar', className)}>
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={startColor} />
          <stop offset="100%" stopColor={endColor} />
        </linearGradient>
      </defs>
      <circle
        className="round-progressbar__circle-background"
        cx={squareSize / 2}
        cy={squareSize / 2}
        r={radius}
        strokeWidth={`${strokeWidth}px`}
      />
      <circle
        className="round-progressbar__circle-progress"
        cx={squareSize / 2}
        cy={squareSize / 2}
        r={radius}
        strokeWidth={`${strokeWidth}px`}
        // Start progress marker at 12 O'Clock
        transform={`rotate(-90 ${squareSize / 2} ${squareSize / 2})`}
        stroke="url(#gradient)"
        style={{
          strokeDasharray: dashArray,
          strokeDashoffset: dashOffset,
        }}
      />
    </svg>
  );
};

RoundProgressbar.propTypes = componentPropertyTypes;

RoundProgressbar.defaultProps = defaultProps;

export default RoundProgressbar;
