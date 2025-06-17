import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import env from 'config/env';

class Portal extends React.Component {
  static propTypes = {
    children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]).isRequired,
  };

  constructor(props) {
    super(props);
    if (env.isClient()) {
      this.el = window.document.createElement('div');
    }
  }

  componentDidMount() {
    this.portalsRoot = window.document.getElementById('portals');
    this.portalsRoot.appendChild(this.el);
  }

  componentWillUnmount() {
    this.portalsRoot.removeChild(this.el);
  }

  render() {
    if (env.isClient()) {
      return ReactDOM.createPortal(this.props.children, this.el);
    }
    return null;
  }
}

export default Portal;
