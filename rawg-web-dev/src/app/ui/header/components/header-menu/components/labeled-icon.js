import React from 'react';
import PropTypes from 'prop-types';

import { labelPropType } from '../../browse-menu/components/header-browse-link';

import '../header-menu-phone.styl';

const propTypes = {
  label: labelPropType.isRequired,
  iconClassName: PropTypes.string.isRequired,
};

const LabeledIcon = ({ label, iconClassName }) => (
  <div className="header-menu__labeled-icon">
    <div className="header-menu__labeled-icon__icon-area">
      <div className={iconClassName} />
    </div>
    <div className="header-menu__labeled-icon__label">{label}</div>
  </div>
);

LabeledIcon.propTypes = propTypes;

export default LabeledIcon;
