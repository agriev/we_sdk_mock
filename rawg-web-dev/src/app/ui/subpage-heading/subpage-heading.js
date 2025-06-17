import React from 'react';
import { Link } from 'app/components/link';
import SVGInline from 'react-svg-inline';
import PropTypes from 'prop-types';

import arrowThin from 'assets/icons/arrow-thin.svg';

import gameType from 'app/pages/game/game.types';

import './subpage-heading.styl';

const SubpageHeadingPropertyTypes = {
  path: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
    state: gameType.isRequired,
  }).isRequired,
  title: PropTypes.node,
  nearTitle: PropTypes.node,
  hideArrow: PropTypes.bool,
};

const SubpageHeadingDefaultProperties = {
  title: '',
  hideArrow: false,
  nearTitle: null,
};

const SubpageHeading = ({ path, title, hideArrow, nearTitle }) => (
  <div className="subpage-heading">
    {!hideArrow && (
      <Link className="subpage-heading__back" to={path} href={path}>
        <SVGInline className="subpage-heading__back-arrow" svg={arrowThin} />
      </Link>
    )}
    {title}
    {nearTitle}
  </div>
);

SubpageHeading.propTypes = SubpageHeadingPropertyTypes;
SubpageHeading.defaultProps = SubpageHeadingDefaultProperties;

export default SubpageHeading;
