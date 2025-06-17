import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';
import ReactMarkdown from 'react-markdown/with-html';
import SyntaxHighlighter from 'react-syntax-highlighter';

import get from 'lodash/get';
import isFunction from 'lodash/isFunction';
import isObjectLike from 'lodash/isObjectLike';
import kebabCase from 'lodash/kebabCase';

@hot
class MarkdownComponent extends React.Component {
  static propTypes = {
    text: PropTypes.string,
    forwardedRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  };

  static defaultProps = {
    forwardedRef: undefined,
  };

  headingIds = [];

  constructor(props, context) {
    super(props, context);

    if (isFunction(this.props.forwardedRef)) {
      this.props.forwardedRef(this);
    }

    if (isObjectLike(this.props.forwardedRef)) {
      this.props.forwardedRef.current = this;
    }
  }

  getHeadingIds = () => this.headingIds;

  renderers = {
    /* eslint-disable react/prop-types */
    heading: ({ children, level }) => {
      const Tag = `h${level}`;
      const title = get(children, '[0].props.value');
      const id = kebabCase(title);

      this.headingIds.push({ title, id });

      return <Tag id={id}>{children}</Tag>;
    },

    link: ({ children, href, target }) => {
      return (
        <a href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined}>
          {children}
        </a>
      );
    },

    code: (props) => {
      return <SyntaxHighlighter language="javascript">{props.value}</SyntaxHighlighter>;
    },
  };

  render() {
    this.ids = [];

    return <ReactMarkdown escapeHtml={false} linkTarget="_blank" source={this.props.text} renderers={this.renderers} />;
  }
}

const Markdown = React.forwardRef((props, ref) => <MarkdownComponent {...props} forwardedRef={ref} />);

export default Markdown;
