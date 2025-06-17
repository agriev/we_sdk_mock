import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import capitalize from 'lodash/capitalize';

import Breadcrumbs from 'app/ui/breadcrumbs';

const propTypes = {
  path: PropTypes.string.isRequired,
  platforms: PropTypes.arrayOf(PropTypes.shape({})),
  stores: PropTypes.arrayOf(PropTypes.shape({})),
  genres: PropTypes.arrayOf(PropTypes.shape({})),
  years: PropTypes.arrayOf(PropTypes.shape({})),
};

const defaultProps = {
  platforms: [],
  stores: [],
  genres: [],
  years: [],
};

@connect((state) => ({
  genres: state.app.genres,
  stores: state.app.stores,
  platforms: state.games.platforms,
  years: state.games.years,
}))
class GamesBreadcrumbs extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  getBreadcrumbsItem = (value) => ({ slug: value, name: value });

  getCustomItemsNames = (result) => {
    const { path } = this.props;
    const slugs = path.split('/');

    return slugs.reduce((names, slug) => {
      const current =
        !['', 'games'].includes(slug) && !result[slug]
          ? {
              [slug]: slug
                .split('-')
                .map(capitalize)
                .join(' '),
            }
          : {};

      return { ...names, ...current };
    }, {});
  };

  getNamesForBreadcrumbs() {
    const { platforms, stores, genres, years } = this.props;

    const allPlatforms = platforms.reduce((res, { platforms: ps, ...p }) => [...res, p, ...ps], []);

    const allYears = years.reduce(
      (res, year) => [
        ...res,
        this.getBreadcrumbsItem(`${year.from}-${year.to}`),
        ...year.years.map((y) => this.getBreadcrumbsItem(y.year)),
      ],
      [],
    );

    const result = [...allPlatforms, ...stores, ...genres, ...allYears].reduce(this.extendNames, {});

    return { ...result, ...this.getCustomItemsNames(result) };
  }

  extendNames = (names, item) => ({ ...names, [item.slug]: item.name });

  render() {
    const { path } = this.props;

    return <Breadcrumbs path={path} customNames={this.getNamesForBreadcrumbs()} />;
  }
}

export default GamesBreadcrumbs;
