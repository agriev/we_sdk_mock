import React, { Component } from 'react';
import { Link } from 'app/components/link';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';

import getBreadcrumbs from 'tools/get-breadcrumbs';
import intlShape from 'tools/prop-types/intl-shape';

import './breadcrumbs.styl';

const listType = 'http://schema.org/BreadcrumbList';
const itemType = 'http://schema.org/ListItem';

const propTypes = {
  children: PropTypes.node,
  path: PropTypes.string.isRequired,
  customNames: PropTypes.shape({
    [PropTypes.string]: PropTypes.string,
  }),
  intl: intlShape.isRequired,
  style: PropTypes.object,
};

const defaultProps = {
  customNames: null,
};

@injectIntl
class Breadcrumbs extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  renderLink(name, path) {
    return (
      <Link className="breadcrumbs__link" itemProp="item" to={path} href={path}>
        <span className="breadcrumbs__name" itemProp="name">
          {name}
        </span>
      </Link>
    );
  }

  renderItem(item, index) {
    return (
      <li className="breadcrumbs__item" itemProp="itemListElement" itemScope itemType={itemType} key={index}>
        {this.renderLink(item.name, item.path)}
        <meta itemProp="position" content={index + 1} />
        <span className="breadcrumbs__separator">/</span>
      </li>
    );
  }

  renderLastItem(item, index) {
    return (
      <li className="breadcrumbs__item" key={index}>
        <span className="breadcrumbs__name" itemProp="name">
          {item.name}
        </span>
      </li>
    );
  }

  render() {
    const { path, customNames, intl } = this.props;
    const items = getBreadcrumbs(path, customNames, intl);

    return (
      <div className="breadcrumbs" style={this.props.style}>
        <ol className="breadcrumbs__list" itemScope itemType={listType}>
          {items.map((item, index) =>
            index === items.length - 1 ? this.renderLastItem(item, index) : this.renderItem(item, index),
          )}
        </ol>

        {this.props.children}
      </div>
    );
  }
}

export default Breadcrumbs;
