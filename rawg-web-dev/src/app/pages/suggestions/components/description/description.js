import React, { Component } from 'react';
import TextTruncate from 'react-text-truncate';
import sanitizeHtml from 'sanitize-html';
import PropTypes from 'prop-types';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import Heading from 'app/ui/heading';

const propTypes = {
  h1: PropTypes.string,
  description: PropTypes.string,
};

const defaultProps = {
  h1: null,
  description: null,
};

class SuggestionsDescription extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.state = { expanded: false };
  }

  expand = () => {
    this.setState({ expanded: true });
  };

  renderTruncatedText() {
    const description = sanitizeHtml(this.props.description, { allowedTags: [] });
    const child = (
      <span className="games__suggestions__seo-area__text-more" onClick={this.expand} role="button" tabIndex={0}>
        <SimpleIntlMessage id="shared.review_more" />
      </span>
    );

    return (
      <TextTruncate
        className="games__suggestions__seo-area__description"
        line={3}
        truncateText="…"
        text={description}
        textTruncateChild={child}
      />
    );
  }

  renderFullText() {
    const description = sanitizeHtml(this.props.description, { allowedTags: [] });

    return <div className="games__suggestions__seo-area__description">{description}</div>;
  }

  render() {
    const { h1, description } = this.props;
    const { expanded } = this.state;

    return (
      <div className="games__suggestions__seo-area">
        <Heading className="games__suggestions__seo-area__title" rank={1} withMobileOffset>
          {h1}
        </Heading>
        {description && (expanded ? this.renderFullText() : this.renderTruncatedText())}
      </div>
    );
  }
}

export default SuggestionsDescription;
