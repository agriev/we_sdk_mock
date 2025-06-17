import React, { Component } from 'react';
import TextTruncate from 'react-text-truncate';
import sanitizeHtml from 'sanitize-html';
import PropTypes from 'prop-types';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import '../../games.styl';

const propTypes = {
  description: PropTypes.string,
};

const defaultProps = {
  description: null,
};

class Description extends Component {
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

    return (
      <TextTruncate
        className="games__seo-area__description"
        line={3}
        truncateText="…"
        text={description}
        textTruncateChild={
          <span className="games__seo-area__text-more" onClick={this.expand} role="button" tabIndex={0}>
            <SimpleIntlMessage id="shared.review_more" />
          </span>
        }
      />
    );
  }

  renderFullText() {
    const description = sanitizeHtml(this.props.description, { allowedTags: [] });

    return <div className="games__seo-area__description">{description}</div>;
  }

  render() {
    const { description } = this.props;
    const { expanded } = this.state;

    if (!description) {
      return null;
    }

    return <div className="games__seo-area">{expanded ? this.renderFullText() : this.renderTruncatedText()}</div>;
  }
}

export default Description;
