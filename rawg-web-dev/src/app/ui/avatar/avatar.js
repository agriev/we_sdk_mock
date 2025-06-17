import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';
import memoizeOne from 'memoize-one';

import get from 'lodash/get';

import RenderMounted from 'app/render-props/render-mounted';

import './avatar.styl';

const componentPropertyTypes = {
  size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  src: PropTypes.string,
  profile: PropTypes.shape({}),
  className: PropTypes.string,
  icon: PropTypes.string,
};

const componentDefaultProperties = {
  size: 32,
  src: '',
  profile: {},
  className: '',
  icon: undefined,
};

function getRandomAvatar(profile) {
  if (profile && profile.id) {
    return profile.id % 5;
  }
  return 0;
}

const getClassName = ({ className, src, profile, icon }) =>
  cn('avatar', {
    // [`avatar_${size}`]: size,
    [`avatar_default-${getRandomAvatar(profile)}`]: !src,
    'avatar_with-icon': Boolean(icon),
    [className]: className,
  });

const getStyle = memoizeOne(({ src, size, visible }) => {
  const style = { width: `${size}px`, height: `${size}px` };

  if (src && visible) {
    const url = src.replace('/media/', `/media/resize/${size > 54 ? '200' : '80'}/-/`);
    style.backgroundImage = `url(${url})`;
  }

  return style;
});

const getInitials = (profile) =>
  profile.full_name
    ? profile.full_name
        .split(' ')
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
    : get(profile, 'username[0]');

class Avatar extends Component {
  render() {
    const { className, src, profile, size, icon } = this.props;

    return (
      <RenderMounted>
        {({ visible, onChildReference }) => (
          <div
            ref={(reference) => onChildReference(reference)}
            className={getClassName({
              className,
              src,
              profile,
              icon,
            })}
            style={getStyle({ src, size, visible })}
          >
            {icon && <SVGInline svg={icon} />}
            {!src && profile && (
              <span className="avatar__initials" style={{ fontSize: `${size / 2}px` }}>
                {getInitials(profile)}
              </span>
            )}
          </div>
        )}
      </RenderMounted>
    );
  }
}

Avatar.propTypes = componentPropertyTypes;
Avatar.defaultProps = componentDefaultProperties;

export default Avatar;
