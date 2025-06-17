import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import append from 'ramda/src/append';
import uniqWith from 'ramda/src/uniqWith';
import eqBy from 'ramda/src/eqBy';
import prop from 'ramda/src/prop';
import path from 'ramda/src/path';
import assoc from 'ramda/src/assoc';
import map from 'ramda/src/map';
import equals from 'ramda/src/equals';

import { findParentPlatform } from 'app/pages/game/game.helper.js';

import './platforms.styl';

const getPlatforms = (props) => {
  let { platforms } = props;
  const { parentPlatforms, parents = true } = props;

  if (Array.isArray(parentPlatforms) && parentPlatforms.length > 0) {
    platforms = parentPlatforms.map((platform) => ({
      ...platform.platform,
      selected: platform.selected,
    }));
  } else {
    platforms = platforms.map((platform) => platform.platform);
  }

  platforms = platforms.reduce((array, platform) => {
    const parent = findParentPlatform(platform.name);

    if (!parent) return array;

    const withParentName = assoc('parentName', parent.name, platform);

    return append(withParentName, array);
  }, []);

  if (parents) {
    return uniqWith(eqBy(prop('parentName')), platforms);
  }

  return platforms;
};

export default class Platforms extends Component {
  static propTypes = {
    platforms: PropTypes.arrayOf(
      PropTypes.shape({
        platform: PropTypes.shape({
          id: PropTypes.number.isRequired,
          name: PropTypes.string.isRequired,
          slug: PropTypes.string.isRequired,
        }),
      }),
    ).isRequired,
    parentPlatforms: PropTypes.arrayOf(
      PropTypes.shape({
        platform: PropTypes.shape({
          id: PropTypes.number.isRequired,
          name: PropTypes.string.isRequired,
          slug: PropTypes.string.isRequired,
        }),
        selected: PropTypes.bool,
      }),
    ),
    size: PropTypes.oneOf(['big', 'medium', 'small']).isRequired,
    parents: PropTypes.bool,
    className: PropTypes.string,
    selectable: PropTypes.bool,
    maxItems: PropTypes.number,
  };

  static defaultProps = {
    selectable: false,
    parentPlatforms: [],
    className: '',
    parents: false,
    maxItems: undefined,
  };

  constructor(props) {
    super(props);

    const { selectable } = this.props;

    this.className = this.getClassName(selectable);

    const { platforms, parentPlatforms, parents = true } = this.props;

    this.state = {
      platformsIds: map(path(['platform', 'slug']), this.props.platforms || []),
      parentPlatformsIds: map(path(['platform', 'slug']), this.props.parentPlatforms || []),
      platforms: getPlatforms({ platforms, parentPlatforms, parents }),
    };
  }

  static getDerivedStateFromProps(props, state) {
    const platformsIds = map(path(['platform', 'slug']), props.platforms || []);
    const parentPlatformsIds = map(path(['platform', 'slug']), props.parentPlatforms || []);

    if (!equals(platformsIds, state.platformsIds) || !equals(parentPlatformsIds, state.parentPlatformsIds)) {
      return {
        platformsIds,
        parentPlatformsIds,
        platforms: getPlatforms(props),
      };
    }

    return null;
  }

  getClassName = (selectable) => {
    const { className, size } = this.props;

    return classnames('platforms', {
      platforms__selectable: selectable,
      [`platforms_${size}`]: size,
      [className]: className,
    });
  };

  render() {
    const { size, maxItems } = this.props;
    const { platforms } = this.state;

    const isLargeList = maxItems ? platforms.length > maxItems + 1 : false;
    const visiblePlatforms = isLargeList ? platforms.slice(0, maxItems) : platforms;
    const additional = isLargeList ? `+${platforms.length - maxItems}` : 0;

    return (
      <div className={this.className}>
        {visiblePlatforms.map((platform) => (
          <div
            key={platform.id}
            className={classnames(
              'platforms__platform',
              `platforms__platform_${size}`,
              `platforms__platform_${platform.parentName}`,
              { platforms__platform_selected: platform.selected },
            )}
          />
        ))}
        {!!additional && <span className="platforms__additional">{additional}</span>}
      </div>
    );
  }
}
