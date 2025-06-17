import { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import noop from 'lodash/noop';

import env from 'config/env';

if (env.isClient()) {
  /* eslint-disable global-require */
  require('intersection-observer');
}

// const DEFAULT_VISIBILITY = env.isServer();
const DEFAULT_VISIBILITY = false;

@connect((state) => ({
  isSpider: state.app.request.isSpider,
}))
class RenderMounted extends Component {
  static propTypes = {
    isSpider: PropTypes.bool.isRequired,
    children: PropTypes.func.isRequired,
    onShow: PropTypes.func,
    onHide: PropTypes.func,
    rootMargin: PropTypes.string,
  };

  static defaultProps = {
    onShow: noop,
    onHide: noop,
    rootMargin: '0px 0px 500px 0px',
  };

  observer = null;

  constructor(props, context) {
    super(props, context);

    this.mounted = true;
    this.state = {
      mounted: false,
      visible: DEFAULT_VISIBILITY,
    };
  }

  componentDidMount() {
    /* eslint-disable-next-line react/no-did-mount-set-state */
    this.setState({ mounted: true });

    this.observer = new window.IntersectionObserver(this.handleIntersection, {
      rootMargin: this.props.rootMargin,
      threshold: [0.01],
    });
  }

  componentWillUnmount() {
    this.mounted = false;
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  handleIntersection = (entry) => {
    if (!this.mounted) {
      return;
    }

    entry.forEach((change) => {
      const { visible } = this.state;

      if (!visible && change.isIntersecting) {
        this.setState({ visible: true });
        this.props.onShow();
      }

      if (visible && !change.isIntersecting) {
        this.setState({ visible: false });
        this.props.onHide();
      }
    });
  };

  handleChildReference = (element) => {
    this.element = element;

    if (this.observer && element) {
      this.observer.observe(this.element);
    }
  };

  render() {
    const { children, isSpider } = this.props;
    const { mounted, visible } = this.state;

    return children({
      mounted,
      visible: visible || isSpider,
      onChildReference: this.handleChildReference,
    });
  }
}

export default RenderMounted;
