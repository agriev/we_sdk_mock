import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';

import debounce from 'lodash/debounce';
import find from 'lodash/find';

import defaultTo from 'ramda/src/defaultTo';
import evolve from 'ramda/src/evolve';
import T from 'ramda/src/T';
import F from 'ramda/src/F';

import memoize from 'fast-memoize';

import { valueProps } from 'app/pages/game-edit/components/select-items/select-items.types';

import SelectUi from './select-ui';
import { getSearchResults, getNextStringSuggest, getPrevStringSuggest, NEW_ITEM_KEY } from './select.helper';

const propTypes = {
  name: PropTypes.string.isRequired,
  currentValues: PropTypes.arrayOf(valueProps).isRequired,
  changedValues: PropTypes.arrayOf(valueProps),
  availableItems: PropTypes.arrayOf(valueProps).isRequired,
  availableItemsLoading: PropTypes.bool,
  searchAvailableItems: PropTypes.func,
  dispatch: PropTypes.func.isRequired,
  selected: valueProps,
  saveItem: PropTypes.func.isRequired,
  disableSelected: PropTypes.func,
};

const defaultProps = {
  selected: undefined,
  changedValues: undefined,
  availableItemsLoading: undefined,
  searchAvailableItems: undefined,
  disableSelected: F,
};

@hot(module)
class EditModalSelectString extends React.Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    const { selected } = this.props;

    this.selectRef = React.createRef();

    this.state = {
      prevSelected: selected,
      inputVal: selected || '',
      showSuggests: false,
      selectedSuggest: undefined,
      notPrinting: false,
    };

    this.onClickOnItem = memoize(this.onClickOnItem);
  }

  componentDidUpdate(previousProperties, previousState) {
    if (previousProperties.selected !== this.props.selected && this.props.selected) {
      this.selectRef.current.setInputFocused();
    }

    if (this.state.selectedSuggest !== previousState.selectedSuggest && this.state.selectedSuggest) {
      const suggests = this.getSearchResults();
      const idx = suggests.indexOf(this.state.selectedSuggest);
      if (idx !== -1) {
        this.selectRef.current.scrollAvailableItemsEl(41 * idx);
      }
    }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.selected !== state.prevSelected && props.selected) {
      return {
        prevSelected: props.selected,
        inputVal: props.selected,
      };
    }

    if (props.selected !== state.prevSelected && !props.selected) {
      return {
        prevSelected: props.selected,
        inputVal: '',
      };
    }

    return null;
  }

  onChangeInput = (event) => {
    const { searchAvailableItems } = this.props;

    this.setState({
      inputVal: event.target.value,
      selectedSuggest: undefined,
    });

    if (event.target.value && searchAvailableItems) {
      this.searchSuggests(event.target.value);
    }
  };

  onInputKeyDown = (event) => {
    const { selectedSuggest, inputVal } = this.state;
    const { disableSelected } = this.props;
    const suggests = this.getSearchResults();

    if (event.key === 'Enter') {
      if (disableSelected(selectedSuggest)) {
        return;
      }

      const value = this.isAvaliableToAddNew() ? inputVal : selectedSuggest || suggests[0];
      this.saveItem(value);
    } else if (event.key === 'ArrowDown') {
      this.nextSuggest();
    } else if (event.key === 'ArrowUp') {
      this.prevSuggest();
    } else {
      this.showSuggestsIfNotShowed();
    }
  };

  onInputFocus = () => {
    this.showSuggestsIfNotShowed();
  };

  onInputClick = () => {
    this.showSuggestsIfNotShowed();
  };

  onClickOnItem = (item) => () => {
    this.props.saveItem(item);
    this.setState({ inputVal: '' });
  };

  onClickOnRootEl = () => {
    this.input.focus();
  };

  onClickOnAddItem = () => {
    const { inputVal } = this.state;
    this.saveItem(inputVal);
  };

  getSearchResults = () => {
    const { currentValues, changedValues, availableItems } = this.props;
    const { inputVal } = this.state;

    const addedItems = defaultTo(currentValues, changedValues);

    return getSearchResults({
      value: inputVal,
      addedItems,
      availableItems,
    });
  };

  getNextSuggest = (current) => {
    const suggests = this.getSearchResults();
    const isNewItemVisible = this.isNewItemVisible(suggests);

    return getNextStringSuggest(current, suggests, isNewItemVisible ? NEW_ITEM_KEY : undefined);
  };

  getPrevSuggest = (current) => {
    const suggests = this.getSearchResults();
    const isNewItemVisible = this.isNewItemVisible(suggests);

    return getPrevStringSuggest(current, suggests, isNewItemVisible ? NEW_ITEM_KEY : undefined);
  };

  showSuggestsIfNotShowed = () => {
    if (!this.state.showSuggests) {
      this.setState({ showSuggests: true, notPrinting: false });
    }
  };

  /* eslint-disable-next-line react/sort-comp */
  searchSuggests = debounce((query) => {
    const { dispatch, searchAvailableItems } = this.props;

    dispatch(searchAvailableItems(query));
    this.setState({ notPrinting: true });
  }, 500);

  hideSuggest = () => {
    this.setState({ showSuggests: false });
  };

  nextSuggest = () => {
    this.setState(
      evolve({
        selectedSuggest: this.getNextSuggest,
        showSuggests: T,
      }),
    );
  };

  prevSuggest = () => {
    this.setState(
      evolve({
        selectedSuggest: this.getPrevSuggest,
        showSuggests: T,
      }),
    );
  };

  saveItem(value) {
    this.props.saveItem(value);
    this.setState({
      showSuggests: false,
      inputVal: '',
    });
  }

  isIncluded(items, value) {
    return !!find(items, (item) => item.toLowerCase() === value.toLowerCase());
  }

  isSuggestsVisible(items) {
    const { showSuggests } = this.state;
    const { searchAvailableItems, availableItemsLoading } = this.props;

    return (
      (!searchAvailableItems && showSuggests && items.length > 0) ||
      ((searchAvailableItems || availableItemsLoading) && showSuggests)
    );
  }

  isAvaliableToAddNew() {
    const { selectedSuggest, inputVal } = this.state;
    const suggests = this.getSearchResults();

    return selectedSuggest === NEW_ITEM_KEY || (inputVal && (!selectedSuggest || suggests.length === 0));
  }

  isNewItemVisible(items) {
    const { availableItemsLoading, currentValues, changedValues } = this.props;
    const { inputVal, notPrinting } = this.state;

    const addedItems = defaultTo(currentValues, changedValues);

    return (
      notPrinting &&
      !availableItemsLoading &&
      !!inputVal &&
      (items.length === 0 || !this.isIncluded(items, inputVal)) &&
      (addedItems.length === 0 || !this.isIncluded(addedItems, inputVal))
    );
  }

  render() {
    const { inputVal, selectedSuggest } = this.state;
    const { name, availableItemsLoading, disableSelected } = this.props;

    const searchResults = this.getSearchResults();

    return (
      <SelectUi
        name={name}
        value={inputVal}
        onChange={this.onChangeInput}
        onKeyDown={this.onInputKeyDown}
        onFocus={this.onInputFocus}
        onBlur={this.onInputBlur}
        onClick={this.onInputClick}
        onClickOnItem={this.onClickOnItem}
        hideSuggest={this.hideSuggest}
        showSuggests={this.isSuggestsVisible(searchResults)}
        searchResults={searchResults}
        selectedSuggest={selectedSuggest}
        type="strings"
        availableItemsLoading={availableItemsLoading}
        onClickOnAddItem={this.onClickOnAddItem}
        showAddNewItem={this.isNewItemVisible(searchResults)}
        ref={this.selectRef}
        disableSelected={disableSelected}
      />
    );
  }
}

export default EditModalSelectString;
