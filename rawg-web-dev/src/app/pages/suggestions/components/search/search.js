import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { replace } from 'react-router-redux';
import { injectIntl } from 'react-intl';
import { stringify } from 'qs';

import formatNumber from 'tools/format-number';
import paths from 'config/paths';

import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import SimpleIntlMessage from 'app/components/simple-intl-message';
import ImportSearchWithInfo from 'app/ui/input-search-with-info';

const propTypes = {
  count: PropTypes.number.isRequired,

  location: locationShape.isRequired,
  h1: PropTypes.string,
  intl: intlShape.isRequired,
  dispatch: PropTypes.func.isRequired,
};

const defaultProps = {
  h1: null,
};

@injectIntl
@connect()
@withRouter
export default class SuggestionsSearch extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  /* eslint-disable react/sort-comp */
  onSearch = (value) => {
    const { dispatch, location } = this.props;
    const { pathname, query } = location;

    if (query.search !== value) {
      const queryString = stringify({
        ...query,
        search: value === '' ? undefined : value,
      });

      dispatch(replace(`${pathname}${queryString ? `?${queryString}` : ''}`));
    }
  };

  onReset = () => {
    const { dispatch, location } = this.props;
    const { pathname, query: queryObject } = location;
    // eslint-disable-next-line no-unused-vars
    const { search, ...query } = queryObject;
    const stringifiedQuery = stringify(query);

    this.onSearch('');

    dispatch(replace(`${pathname}${stringifiedQuery ? `?${stringifiedQuery}` : ''}`));
  };

  renderCounter() {
    const { count } = this.props;

    if (count <= 0) {
      return null;
    }

    return <SimpleIntlMessage id="games.counter_games_only" values={{ count, countStr: formatNumber(count) }} />;
  }

  render = () => {
    const {
      intl,
      h1,
      location: {
        pathname,
        query: { search },
      },
    } = this.props;

    const isCustomPlaceholder = pathname !== paths.games && h1;
    const placeholder = isCustomPlaceholder
      ? intl.formatMessage({ id: 'games.custom-input-search' }, { title: h1.toLowerCase() })
      : intl.formatMessage({ id: 'games.input-search' });

    return (
      <ImportSearchWithInfo
        value={search}
        placeholder={placeholder}
        onSearch={this.onSearch}
        onReset={this.onReset}
        counter={this.renderCounter()}
      />
    );
  };
}
