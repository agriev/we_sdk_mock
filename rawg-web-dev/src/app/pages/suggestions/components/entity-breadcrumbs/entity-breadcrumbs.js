import React, { Component } from 'react';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';

import last from 'lodash/last';
import capitalize from 'lodash/capitalize';
import compact from 'lodash/compact';

import intlShape from 'tools/prop-types/intl-shape';

import Breadcrumbs from 'app/ui/breadcrumbs';

const propTypes = {
  path: PropTypes.string.isRequired,
  intl: intlShape.isRequired,
};

@injectIntl
export default class EntityBreadcrumbs extends Component {
  static propTypes = propTypes;

  getEntityName() {
    const { path } = this.props;
    const slug = last(compact(path.split('/')));
    const name = slug
      .split('-')
      .map(capitalize)
      .join(' ');

    return { slug, name };
  }

  getCustomNames() {
    const { intl } = this.props;
    const entityName = this.getEntityName();

    return {
      suggestions: intl.formatMessage({ id: 'games.tab_suggestions' }),
      [entityName.slug]: entityName.name,
    };
  }

  render() {
    const { path } = this.props;

    return <Breadcrumbs path={path} customNames={this.getCustomNames()} />;
  }
}
