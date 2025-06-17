import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import cn from 'classnames';

import Loading2 from 'app/ui/loading-2';
import Dropdown from 'app/ui/dropdown';

import { appSizeType } from 'app/pages/app/app.types';

import SuggestionsResults from './components/suggestions-results';
import {
  getSuggestionsFromState,
  getSuggestionsCountFromState,
  getSuggestionsLoadingFromState,
} from './search-suggestions.lib';
import './search-suggestions.styl';

const hoc = compose(
  connect((state) => ({
    size: state.app.size,
    allRatings: state.app.ratings,
    suggestions: getSuggestionsFromState(state),
    suggestionsCount: getSuggestionsCountFromState(state),
    isLoading: getSuggestionsLoadingFromState(state),
  })),
);

const propTypes = {
  opened: PropTypes.bool.isRequired,
  searchValue: PropTypes.string,
  handleClose: PropTypes.func.isRequired,
  size: appSizeType.isRequired,
  dispatch: PropTypes.func.isRequired,
  suggestions: PropTypes.shape({}).isRequired,
  suggestionsCount: PropTypes.number.isRequired,
  isLoading: PropTypes.bool.isRequired,
  width: PropTypes.number.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const defaultProps = {
  searchValue: undefined,
};

const SearchSuggestions = ({
  opened,
  searchValue,
  handleClose,
  suggestions,
  suggestionsCount,
  isLoading,
  size,
  dispatch,
  allRatings,
  width,
}) => (
  <Dropdown
    renderenButton={null}
    renderedContent={
      isLoading ? (
        <div className="header__search__loading-wrapper" style={{ width: `${width}px` }}>
          <Loading2 className="header__search__loading" />
        </div>
      ) : (
        <SuggestionsResults
          suggestions={suggestions}
          searchValue={searchValue}
          size={size}
          dispatch={dispatch}
          allRatings={allRatings}
          handleClose={handleClose}
          suggestionsCount={suggestionsCount}
          width={width}
        />
      )
    }
    className="header__search__suggestions"
    containerClassName={cn('header__search__suggestions__container', {
      header__search__suggestions__container_empty: !(suggestionsCount || isLoading),
    })}
    kind="search-suggestions"
    opened={opened}
    onClose={handleClose}
    closeOnClick
  />
);

SearchSuggestions.propTypes = propTypes;
SearchSuggestions.defaultProps = defaultProps;

export default hoc(SearchSuggestions);
