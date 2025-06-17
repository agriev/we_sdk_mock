import React from 'react';

import { labelPropType } from '../header-browse-link';

import './dotted-label.styl';

const propTypes = {
  label: labelPropType.isRequired,
};

const DottedLabel = ({ label }) => (
  <div className="header__browse-menu__dotted-label">
    <div className="header__browse-menu__dotted-label_more" />
    {label}
  </div>
);

DottedLabel.propTypes = propTypes;

export default DottedLabel;
