import React from 'react';
import PropTypes from 'prop-types';
import getScrollContainer from 'tools/get-scroll-container';
import getScrollTop from 'tools/get-scroll-top';

const SCROLLER_EL_ID = 'scrollerEl';

export default class Scroller extends React.Component {
  static propTypes = {
    onScroll: PropTypes.shape({
      up: PropTypes.func,
      down: PropTypes.func,
    }),
    onReach: PropTypes.shape({
      top: PropTypes.func,
      bottom: PropTypes.func,
      offset: PropTypes.number,
    }),
    reachEls: PropTypes.arrayOf(
      PropTypes.shape({
        elId: PropTypes.string,
        top: PropTypes.func,
        bottom: PropTypes.func,
        offset: PropTypes.number,
      }),
    ),
    permanently: PropTypes.bool,
    children: PropTypes.oneOfType([PropTypes.node, PropTypes.array]),
    className: PropTypes.string,
  };

  static defaultProps = {
    permanently: false,
    onScroll: undefined,
    onReach: undefined,
    reachEls: [],
    children: undefined,
    className: undefined,
  };

  constructor(props) {
    super(props);

    this.ticking = false;
    this.prevVal = 0;
    this.currentVal = 0;

    this.reachEls = {};

    this[SCROLLER_EL_ID] = {
      onScrollUpCalled: false,
      onScrollDownCalled: false,
      onReachTopCalled: false,
      onReachBottomCalled: false,
    };

    this.handleScroll = this.handleScroll.bind(this);
  }

  componentDidMount() {
    getScrollContainer().addEventListener('scroll', this.handleScroll);
  }

  componentWillUnmount() {
    getScrollContainer().removeEventListener('scroll', this.handleScroll);
    window.cancelAnimationFrame(this.rafId);
  }

  onScroll() {
    const { onScroll: { up, down } = {} } = this.props;

    if (this.isDown()) {
      if (typeof down === 'function' && (this.props.permanently || !this.onScrollDownCalled)) {
        this.onScrollDownCalled = true;
        this.onScrollUpCalled = false;

        down(this.currentVal);
      }
    } else if (typeof up === 'function' && (this.props.permanently || !this.onScrollUpCalled)) {
      this.onScrollUpCalled = true;
      this.onScrollDownCalled = false;

      up(this.currentVal);
    }
  }

  onReach({ elementId = SCROLLER_EL_ID, onReach: onReachArgument } = {}) {
    const onReach = onReachArgument || this.props.onReach || {};
    const { top, bottom, offset = 0 } = onReach;

    if (this.isDown()) {
      if (
        typeof top === 'function' &&
        (this.props.permanently || !this[elementId].onReachTopCalled) &&
        this.getElRect(elementId).top - offset <= 0
      ) {
        this[elementId].onReachTopCalled = true;
        this[elementId].onReachBottomCalled = false;

        top();
      }
    } else if (
      typeof bottom === 'function' &&
      (this.props.permanently || !this[elementId].onReachBottomCalled) &&
      this.getElRect(elementId).top - offset >= 0
    ) {
      this[elementId].onReachBottomCalled = true;
      this[elementId].onReachTopCalled = false;

      bottom();
    }
  }

  onReachEls() {
    this.props.reachEls.forEach((reachElement) => {
      const { elementId, onReach } = reachElement;

      if (!this[elementId]) {
        this[elementId] = { el: window.document.getElementById(elementId) };
      }

      if (!this[elementId].el) {
        return;
      }

      this.onReach({ elementId, onReach });
    });
  }

  getEl() {
    return this.rootEl;
  }

  getElRect(elementId) {
    const element = this[elementId].el || this.getEl();

    return element.getBoundingClientRect();
  }

  isDown() {
    return this.currentVal > this.prevVal;
  }

  handleScroll() {
    this.prevVal = this.currentVal;
    this.currentVal = getScrollTop();

    if (this.ticking) {
      return;
    }

    this.rafId = window.requestAnimationFrame(() => {
      this.onScroll();
      this.onReach();
      this.onReachEls();

      this.ticking = false;
    });

    this.ticking = true;
  }

  render() {
    return (
      <div
        ref={(reference) => {
          this.rootEl = reference;
        }}
        className={this.props.className}
      >
        {this.props.children}
      </div>
    );
  }
}
