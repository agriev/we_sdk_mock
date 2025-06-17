import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader/root';
import classnames from 'classnames';

import noop from 'lodash/noop';
import get from 'lodash/get';

import appHelper from 'app/pages/app/app.helper';
import env from 'config/env';
import getAppContainer from 'tools/get-app-container';

import Portal from 'app/ui/portal';

import './dropdown.styl';
import getScrollTop from 'tools/get-scroll-top';
import getAppContainerWidth from 'tools/get-app-container-width';
import getScrollContainer from 'tools/get-scroll-container';

const OPEN_MENU_WAIT = 50;

const propTypes = {
  renderButton: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  renderContent: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  renderedButton: PropTypes.shape(),
  renderedContent: PropTypes.shape(),
  opened: PropTypes.bool,
  onOpen: PropTypes.func,
  onClose: PropTypes.func,
  kind: PropTypes.oneOf([
    'filter',
    'menu',
    'multiple-editing',
    'sharing',
    'search-results',
    'search-suggestions',
    'card',
  ]),
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  closeOnClick: PropTypes.bool,
  size: PropTypes.string.isRequired,
  isMouseOver: PropTypes.bool,
  closeOnScroll: PropTypes.bool,
  headerWidths: PropTypes.bool,
  sameWidth: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  alwaysRenderContent: PropTypes.bool,
};

const defaultProps = {
  renderButton: () => null,
  renderContent: () => null,
  renderedButton: undefined,
  renderedContent: undefined,
  opened: false,
  onOpen: noop,
  onClose: noop,
  kind: undefined,
  className: '',
  containerClassName: '',
  closeOnClick: false,
  isMouseOver: false,
  closeOnScroll: false,
  headerWidths: false,
  sameWidth: undefined,
  alwaysRenderContent: false,
};

@hot
@connect((state) => ({
  size: state.app.size,
}))
export default class Dropdown extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.unmounted = false;

    this.state = {
      opened: false,
      closing: false,
    };

    this.contentRef = React.createRef();
    this.containerRef = React.createRef();
    this.buttonRef = React.createRef();
  }

  componentDidMount() {
    getScrollContainer().addEventListener('scroll', this.handleScroll);
  }

  componentDidUpdate(previousProperties, previousState) {
    const { sameWidth } = this.props;

    if (!previousProperties.opened && this.props.opened && !this.state.opened) {
      this.open();
    }

    if (previousProperties.opened && !this.props.opened && this.state.opened) {
      this.close();
    }

    if (!previousState.opened && this.state.opened && appHelper.isDesktopSize(this.props.size)) {
      const appWidth = getAppContainerWidth();
      const cardRect = this.containerRef.current.getBoundingClientRect();
      const menuRect = this.contentRef.current.getBoundingClientRect();

      // Это чтобы меню не уходило за правую часть экрана
      if (this.contentRef.current) {
        if (this.props.kind === 'card') {
          this.contentRef.current.style.left = `${Math.min(appWidth - menuRect.width - 10, cardRect.left)}px`;
        }

        if (sameWidth) {
          const { width } = this.getSameWidthEl().getBoundingClientRect();
          this.contentRef.current.style.width = `${width}px`;
        }
      }
    }
  }

  componentWillUnmount() {
    this.unmounted = true;
    getScrollContainer().removeEventListener('scroll', this.handleScroll);
    getAppContainer().style.overflow = '';
  }

  getSameWidthEl = () => {
    const { sameWidth } = this.props;

    if (sameWidth === 'button') {
      return this.buttonRef.current;
    }

    return sameWidth;
  };

  getClassName = () => {
    const { kind, className } = this.props;
    const { opened } = this.state;

    return classnames('dropdown', {
      dropdown_opened: opened,
      [`dropdown_${kind}`]: kind,
      [className]: className,
    });
  };

  getOverlayClassName = () => {
    const { kind, headerWidths } = this.props;
    const { opened } = this.state;

    return classnames('dropdown__overlay', {
      dropdown__overlay_opened: opened,
      'dropdown__overlay_header-widths': headerWidths,
      'dropdown__overlay_standard-widths': !headerWidths,
      [`dropdown__overlay_${kind}`]: kind,
    });
  };

  getContainerClassName = () => {
    const { kind, containerClassName, headerWidths } = this.props;
    const { opened, closing } = this.state;

    return classnames('dropdown__container', {
      dropdown__container_opened: opened,
      dropdown__container_closed: closing || !opened,
      dropdown__container_closing_animation: closing,
      'dropdown__container_header-widths': headerWidths,
      'dropdown__container_standard-widths': !headerWidths,
      dropdown__container_fixed:
        env.isClient() && kind === 'filter' && window.document.querySelector('.filter-inner_fixed'),
      [`dropdown__container_${kind}`]: kind,
      [containerClassName]: containerClassName,
    });
  };

  getContainerStyle = () => this.state.containerPosition;

  getContainerPosition() {
    const { size, kind } = this.props;

    if (appHelper.isPhoneSize({ size })) {
      return {
        top: 'auto',
      };
    }

    const appWidth = getAppContainerWidth();
    const dropdownRect = this.buttonRef.current.getBoundingClientRect();
    const containerPosition = {};

    if (kind === 'card') {
      containerPosition.top = dropdownRect.top + getScrollTop() - 8;
    } else {
      containerPosition.top = dropdownRect.top + getScrollTop();
    }

    if (['menu', 'sharing'].includes(kind)) {
      containerPosition.right = appWidth - dropdownRect.right;
      containerPosition.left = 'auto';
    } else if (kind === 'card') {
      // containerPosition.left = dropdownRect.left - 8;
    } else {
      containerPosition.left = dropdownRect.left;
    }

    return containerPosition;
  }

  handleScroll = () => {
    const { size, closeOnScroll } = this.props;
    if (closeOnScroll && this.state.opened && appHelper.isDesktopSize({ size })) {
      this.setState({ opened: false });
    }
  };

  open = () => {
    if (this.state.opened || this.unmounted) {
      return;
    }

    const { size } = this.props;
    if (appHelper.isPhoneSize(size)) {
      getAppContainer().style.overflow = 'hidden';
    }

    this.props.onOpen();

    this.setState({
      closing: false,
      opened: true,
      containerPosition: this.getContainerPosition(),
    });

    setTimeout(() => {
      this.addCloseEventListener();
    }, 100);
  };

  // eslint-disable-next-line react/sort-comp
  openDebounced = () => {
    clearTimeout(this.openDebouncedTimer);
    this.openDebouncedTimer = setTimeout(this.open, OPEN_MENU_WAIT);
  };

  mouseLeaveDisableOpen = () => {
    clearTimeout(this.openDebouncedTimer);
  };

  mouseLeaveClose = () => {
    const { size } = this.props;
    if (appHelper.isDesktopSize({ size })) {
      this.close();
    }
  };

  close = () => {
    if (get(window, 'DISABLE_DROPDOWNS_CLOSE') === true) {
      return;
    }

    getAppContainer().style.overflow = '';

    this.removeCloseEventListener();
    this.props.onClose();

    if (this.state.closing || !this.state.opened) {
      return;
    }

    this.setState({ closing: true, opened: false });

    setTimeout(() => {
      this.setState({ closing: false, opened: false });
    }, 300);
  };

  onClickOnBody = (e) => {
    const { closeOnClick } = this.props;
    const target = e.type === 'touchend' && e.touches.length > 0 ? e.touches[0] : e.target;
    const parent = this.contentRef.current;

    if ((parent && !parent.contains(target)) || closeOnClick) {
      this.close();
    }
  };

  addCloseEventListener() {
    window.document.body.addEventListener('click', this.onClickOnBody, true);
  }

  removeCloseEventListener() {
    window.document.body.removeEventListener('click', this.onClickOnBody, true);
  }

  renderContent = () => {
    const { renderContent, renderedContent, isMouseOver } = this.props;

    return (
      <>
        <div
          className={this.getOverlayClassName()}
          onClick={isMouseOver ? undefined : this.onClickOnBody}
          role="button"
          tabIndex={0}
        />
        <div
          className={this.getContainerClassName()}
          style={this.getContainerStyle()}
          onMouseLeave={isMouseOver ? this.mouseLeaveClose : undefined}
        >
          <div className="dropdown__content" ref={this.contentRef}>
            {renderedContent || renderContent()}
          </div>
        </div>
      </>
    );
  };

  render() {
    const { opened, closing } = this.state;
    const { renderButton, renderedButton, isMouseOver, size, alwaysRenderContent } = this.props;

    return (
      <>
        <div className={this.getClassName()} ref={this.containerRef} id="dropdown-container">
          <div
            className="dropdown__button"
            ref={this.buttonRef}
            role="button"
            tabIndex={0}
            onClick={this.open}
            onMouseOver={isMouseOver && appHelper.isDesktopSize({ size }) ? this.openDebounced : undefined}
            onMouseLeave={isMouseOver && appHelper.isDesktopSize({ size }) ? this.mouseLeaveDisableOpen : undefined}
            onFocus={isMouseOver && appHelper.isPhoneSize({ size }) ? this.open : undefined}
          >
            {renderedButton || renderButton()}
          </div>
          {(opened || closing) && !alwaysRenderContent && <Portal>{this.renderContent()}</Portal>}
        </div>
        {alwaysRenderContent && this.renderContent()}
      </>
    );
  }
}
