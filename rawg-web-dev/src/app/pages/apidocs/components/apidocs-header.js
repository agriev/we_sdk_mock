import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { compose, withState } from 'recompose';
import { hot } from 'react-hot-loader';
import SVGInline from 'react-svg-inline';
import useOnClickOutside from 'use-onclickoutside';

import SocialLinks from './social-links';
import menuIcon from '../assets/menu.svg';
import closeIcon from '../assets/close.svg';

const hoc = compose(
  hot(module),
  withState('isOpen', 'setIsOpen', false),
);

const componentPropertyTypes = {
  isOpen: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
};

const links = (
  <div className="apidocs-header__anchors">
    <a href="#why-rawg-api" className="apidocs-header__anchor">
      Why RAWG API
    </a>
    <a href="#pricing" className="apidocs-header__anchor">
      Pricing
    </a>
    <a href="#terms" className="apidocs-header__anchor">
      Terms
    </a>
    <a href="#updates" className="apidocs-header__anchor">
      Updates
    </a>
    <a href="#use-cases" className="apidocs-header__anchor">
      Use Cases
    </a>
    <div className="apidocs-header__anchor patreon-widget">
      <a href="https://www.patreon.com/bePatron?u=52242884" data-patreon-widget-type="become-patron-button">
        Become a Patron!
      </a>
    </div>
  </div>
);

const ApidocsHeader = ({ isOpen, setIsOpen }) => {
  const ref = useRef(null);
  const close = () => setIsOpen(false);
  const openMenu = () => {
    /**
     * use-onclickoutside отрабатывает и при клике на закрыть снова открывается,
     * т.к. этот эвент отрабатывает позже
     */
    if (ref.current.offsetHeight === 0) {
      setIsOpen(true);
    }
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://c6.patreon.com/becomePatronButton.bundle.js';
    script.async = true;
    document.head.appendChild(script);
  });

  useOnClickOutside(ref, close);

  return (
    <header className="apidocs-header">
      <a href="/" className="logo">
        RAWG
      </a>
      {links}
      <SocialLinks />
      <SVGInline
        role="button"
        tabIndex={0}
        className="apidocs-header__burger"
        svg={isOpen ? closeIcon : menuIcon}
        onClick={openMenu}
      />
      <div
        role="button"
        tabIndex={0}
        ref={ref}
        className={`apidocs-header__menu ${isOpen ? '_visible' : '_hidden'}`}
        onClick={close}
      >
        {links}
        <SocialLinks />
      </div>
    </header>
  );
};

ApidocsHeader.propTypes = componentPropertyTypes;

export default hoc(ApidocsHeader);
