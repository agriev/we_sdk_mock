/* eslint-disable react/no-danger */
import React from 'react';
import PropTypes from 'prop-types';
import { compose, withState } from 'recompose';
import { hot } from 'react-hot-loader';
import SVGInline from 'react-svg-inline';

import arrowIcon from '../assets/arrow.svg';

const hoc = compose(
  hot(module),
  withState('isOpen', 'setIsOpen', ({ opened }) => opened),
);

const componentPropertyTypes = {
  title: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
};

const ApidocsAccordion = ({ title, text, isOpen, setIsOpen }) => (
  <div className={`apidocs-accordion ${isOpen ? '_visible' : '_hidden'}`}>
    <div
      role="button"
      className="apidocs-accordion__title apidocs-lead"
      onClick={() => setIsOpen(!isOpen)}
      tabIndex={0}
    >
      {title}
      <SVGInline className="apidocs-accordion__icon" svg={arrowIcon} />
    </div>
    <code className="apidocs-accordion__text">{text}</code>
  </div>
);
ApidocsAccordion.propTypes = componentPropertyTypes;

export default hoc(ApidocsAccordion);
