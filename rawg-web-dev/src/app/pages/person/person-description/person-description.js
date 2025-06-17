import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { injectIntl } from 'react-intl';
import cn from 'classnames';

import './person-description.styl';

import intlShape from 'tools/prop-types/intl-shape';

const componentPropertyTypes = {
  className: PropTypes.string,
  description: PropTypes.string,
  intl: intlShape.isRequired,
};

const defaultProps = {
  className: '',
  description: '',
};

// close tags if they were cutted
const fixHtml = (html) => {
  let outputHTML = html;
  if (typeof document !== 'undefined') {
    // eslint-disable-next-line no-undef
    const div = document.createElement('div');
    div.innerHTML = html;
    outputHTML = div.innerHTML;
  }
  return outputHTML;
};

const descriptionMaxLength = 1100;

@injectIntl
class PersonDescription extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {
      expanded: false,
    };
  }

  expandCollapseText = () => {
    this.setState((state) => ({ expanded: !state.expanded }));
  };

  render() {
    const { className, intl } = this.props;
    const { messages } = intl;

    const { expanded } = this.state;
    const expandable = this.props.description.length > descriptionMaxLength;

    const description =
      expandable && !expanded
        ? fixHtml(
            `${this.props.description.substring(
              0,
              descriptionMaxLength,
              // not a true react way, but possibly best way to deal with html marked description
            )}&hellip; <span class="person-description-full-text">${messages['person.read_more']}</span>`,
          )
        : this.props.description;

    return (
      <div
        className={cn('person-description', className, {
          'person-description-expandable': expandable,
        })}
        onClick={this.expandCollapseText}
        itemProp="description"
        role="presentation"
      >
        <div
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: description }}
        />
      </div>
    );
  }
}

PersonDescription.defaultProps = defaultProps;

export default PersonDescription;
