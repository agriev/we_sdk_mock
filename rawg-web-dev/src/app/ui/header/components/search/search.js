import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { injectIntl } from 'react-intl';

import debounce from 'lodash/debounce';
import isFinite from 'lodash/isFinite';

import formatNumber from 'tools/format-number';
import cn from 'classnames';
import memoizeOne from 'memoize-one';

import paths from 'config/paths';
import appHelper from 'app/pages/app/app.helper';

import { appSizeType } from 'app/pages/app/app.types';
import { currentUserIdType } from 'app/components/current-user/current-user.types';
import intlShape from 'tools/prop-types/intl-shape';

import { getSuggestions } from './search.actions';

import SearchSuggestions from './components/search-suggestions';
import {
  getSuggestionsCountFromState,
  getSuggestionsLoadingFromState,
} from './components/search-suggestions/search-suggestions.lib';

import './search.styl';

const propTypes = {
  intl: intlShape.isRequired,
  dispatch: PropTypes.func.isRequired,
  size: appSizeType.isRequired,
  currentUserId: currentUserIdType,
  gamesCount: PropTypes.number.isRequired,
  suggestionsCount: PropTypes.number.isRequired,
  isLoading: PropTypes.bool.isRequired,
};

const defaultProps = {
  currentUserId: false,
};

@injectIntl
@connect((state) => ({
  size: state.app.size,
  gamesCount: state.app.gamesCount,
  currentUserId: state.currentUser.id,
  suggestionsCount: getSuggestionsCountFromState(state),
  isLoading: getSuggestionsLoadingFromState(state),
}))
class Search extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  inputRef = React.createRef();

  constructor(props, context) {
    super(props, context);

    this.state = {
      focus: false,
    };
  }

  componentDidMount() {
    document.documentElement.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    document.documentElement.addEventListener('keydown', this.onKeyDown);
  }

  onKeyDown = (event) => {
    if (event.code === 'Enter' && event.altKey && this.inputRef.current) {
      event.preventDefault();

      this.inputRef.current.focus();
    }
  };

  getSuggestionsDebounced = debounce(
    memoizeOne((value) => this.setState({ focus: !!value }, () => value && getSuggestions(value)(this.props.dispatch))),
    500,
  );

  handleChange = ({ target: { value } }) => this.getSuggestionsDebounced(value);

  resetInputValue = () => {
    this.inputRef.current.value = '';
    this.setState({ focus: false });
    return this.inputRef.current.focus();
  };

  getPhoneSearchPlaceholderId = () => {
    if (appHelper.isDesktopSize(this.props.size)) {
      return 'header.desktop_search';
    }

    return this.props.currentUserId ? 'header.phone_search' : 'header.phone_guest_search';
  };

  getSearchPlaceholder = () => {
    const { intl, gamesCount } = this.props;

    if (isFinite(gamesCount)) {
      const id = {
        id: this.getPhoneSearchPlaceholderId(),
      };

      return intl.formatMessage(id, {
        count: gamesCount,
        countStr: formatNumber(gamesCount),
      });
    }

    return null;
  };

  handleSubmit = (event) => {
    event.preventDefault();

    const { dispatch } = this.props;
    const { value } = this.inputRef.current;

    if (value) {
      dispatch(push(paths.search(this.inputRef.current.value)));
    }
  };

  handleSuggestionsClose = () => this.setState({ focus: false });

  handleInputFocus = () => this.setState(({ value }) => ({ focus: !!value }));

  getOpened = () => this.state.focus && (!!this.props.suggestionsCount || this.props.isLoading);

  getHasResults = () => this.props.isLoading || (this.state.focus && !!this.props.suggestionsCount);

  getSuggestionsWidth = () => {
    const input = this.inputRef.current;

    if (input) {
      const { width } = input.getBoundingClientRect();

      return width;
    }

    return 280;
  };

  render() {
    const { value } = this.inputRef.current || {};

    return (
      <form
        className={cn('header__search__form', {
          'header__search__form_with-results': this.getHasResults(),
        })}
        role="search"
        onSubmit={this.handleSubmit}
      >
        <div className="header__search__input__area">
          <input
            ref={this.inputRef}
            className={cn('header__search__input', {
              'header__search__input_with-results': this.getHasResults(),
            })}
            type="text"
            role="searchbox"
            onChange={this.handleChange}
            placeholder={this.getSearchPlaceholder()}
          />
          <div className={cn('header__search__hotkey-help__wrap', { hidden: !!value })}>
            <div className="header__search__hotkey-help-key">alt</div>
            <span>+</span>
            <div className="header__search__hotkey-help-key">enter</div>
          </div>
          {!!value && (
            <button onClick={this.resetInputValue} type="button" className="header__search__close-button">
              <span className="header__search__close-button_icon_gray" />
            </button>
          )}
        </div>
        <SearchSuggestions
          width={this.getSuggestionsWidth()}
          opened={this.getOpened()}
          handleClose={this.handleSuggestionsClose}
          searchValue={value}
        />
      </form>
    );
  }
}

export default Search;
