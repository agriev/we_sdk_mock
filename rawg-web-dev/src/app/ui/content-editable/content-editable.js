/* eslint-disable react/no-danger-with-children */

// https://github.com/lovasoa/react-contenteditable

import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';

import './content-editable.styl';

@hot
export default class ContentEditable extends React.Component {
  static propTypes = {
    tagName: PropTypes.string,
    html: PropTypes.string,
    onChange: PropTypes.func,
    onBlur: PropTypes.func,
    onClick: PropTypes.func,
    disabled: PropTypes.bool,
    children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
    placeholder: PropTypes.string,
  };

  static defaultProps = {
    tagName: 'div',
    html: '',
    placeholder: '',
    onChange: undefined,
    onBlur: undefined,
    onClick: undefined,
    disabled: false,
    children: undefined,
  };

  constructor(props) {
    super(props);

    this.emitChange = this.emitChange.bind(this);
    this.state = {
      placeholderShowed: Boolean(this.props.placeholder),
    };
  }

  componentDidMount() {
    // this.htmlElement.addEventListener('paste', this.handlePaste);
  }

  shouldComponentUpdate(nextProperties, nextState) {
    const { props, state, htmlElement } = this;

    // We need not rerender if the change of props simply reflects the user's edits.
    // Rerendering in this case would make the cursor/caret jump

    // Rerender if there is no element yet... (somehow?)
    if (!htmlElement) {
      return true;
    }

    // ...or if html really changed... (programmatically, not by user edit)
    if (nextProperties.html !== htmlElement.innerHTML && nextProperties.html !== props.html) {
      return true;
    }

    const optionalProperties = ['style', 'className', 'disable', 'tagName', 'placeholder'];
    const optionalState = ['placeholderShowed'];

    // Handle additional props
    return (
      optionalProperties.some((name) => props[name] !== nextProperties[name]) ||
      optionalState.some((name) => state[name] !== nextState[name])
    );
  }

  componentDidUpdate() {
    if (
      this.htmlElement &&
      this.props.html !== this.htmlElement.innerHTML &&
      !(this.props.html === '<br>' && this.state.placeholderShowed)
    ) {
      // Perhaps React (whose VDOM gets outdated because we often prevent
      // rerendering) did not update the DOM. So we update it manually now.
      this.htmlElement.innerHTML = this.props.html;
    }
  }

  componentWillUnmount() {
    // this.htmlEl.removeEventListener('paste', this.handlePaste);
  }

  handleClick = (event) => {
    if (this.state.placeholderShowed) {
      this.setState({ placeholderShowed: false });
    }

    if (this.props.onClick) {
      this.props.onClick(event);
    }
  };

  handleFocus = () => {
    if (this.state.placeholderShowed) {
      this.setState({ placeholderShowed: false });
    }
  };

  handleBlur = (event) => {
    if (this.htmlElement.innerHTML === '<br>' && this.props.placeholder) {
      this.setState({ placeholderShowed: true });
    }

    if (this.props.onBlur) {
      this.props.onBlur(event);
    } else {
      this.emitChange(event);
    }
  };

  emitChange(event_ = {}) {
    if (!this.htmlElement) return;

    const event = event_;
    const html = this.htmlElement.innerHTML;

    if (this.props.onChange && html !== this.lastHtml) {
      event.target = { value: html };
      this.props.onChange(event);
    }

    this.lastHtml = html;
  }

  render() {
    const { tagName, placeholder, ...props } = this.props;
    const { placeholderShowed } = this.state;
    let { html } = this.props;

    if (html === '<br>' && placeholderShowed) {
      html = `<div class="content-editable__placeholder">${placeholder}</div>`;
    }

    return React.createElement(
      tagName,
      {
        ...props,
        ref: (e) => {
          this.htmlElement = e;
        },
        onInput: this.emitChange,
        onBlur: this.handleBlur,
        onClick: this.handleClick,
        onFocus: this.handleFocus,
        contentEditable: !this.props.disabled,
        dangerouslySetInnerHTML: { __html: html },
      },
      this.props.children,
    );
  }
}
