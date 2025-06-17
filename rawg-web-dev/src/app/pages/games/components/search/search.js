import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { replace } from 'react-router-redux';
import { injectIntl } from 'react-intl';
import { stringify } from 'qs';
import debounce from 'lodash/debounce';

import formatNumber from 'tools/format-number';
import paths from 'config/paths';

import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import Button from 'app/ui/button';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import InputSearch from 'app/ui/input-search';

import '../../games.styl';

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
@connect((state) => ({
  count: state.games.games.count,
  h1: state.games.games.seo_h1,
}))
@withRouter
export default class Search extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  /* eslint-disable react/sort-comp */
  handleSearchChange = (value) => {
    const {
      dispatch,
      location: { pathname, query },
    } = this.props;

    if (query.search !== value) {
      const queryString = stringify({
        ...query,
        search: value === '' ? undefined : value,
      });

      dispatch(replace(`${pathname}${queryString ? `?${queryString}` : ''}`));
    }
  };

  /* eslint-disable react/sort-comp */
  handleSearchChangeDebounced = debounce(this.handleSearchChange, 500);

  resetSearch = () => {
    const { dispatch, location } = this.props;
    const { pathname, query: queryObject } = location;
    // eslint-disable-next-line no-unused-vars
    const { search, ...query } = queryObject;

    this.inputSearchEl.resetInput();
    this.handleSearchChange('');

    const stringifiedQuery = stringify(query);
    dispatch(replace(`${pathname}${stringifiedQuery ? `?${stringifiedQuery}` : ''}`));
  };

  inputSearchRef = (element) => {
    this.inputSearchEl = element;
  };

  renderCounter() {
    const { count } = this.props;
    return (
      <SimpleIntlMessage
        className="games__counter"
        id="games.counter_games_only"
        values={{ count, countStr: formatNumber(count) }}
      />
    );
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
      <div className="games__search-wrap">
        <div className="games__search__input-wrap">
          <InputSearch
            value={search}
            onChange={this.handleSearchChangeDebounced}
            className="games__input-search"
            placeholder={placeholder}
            ref={this.inputSearchRef}
          />
          {search && search !== '' && (
            <Button kind="fill" size="small" className="games__input-search__reset-button" onClick={this.resetSearch} />
          )}
        </div>
        {this.renderCounter()}
      </div>
    );
  };
}
