import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';

import debounce from 'lodash/debounce';

import defaultTo from 'ramda/src/defaultTo';
import evolve from 'ramda/src/evolve';
import findIndex from 'ramda/src/findIndex';
import propEq from 'ramda/src/propEq';
import T from 'ramda/src/T';

import memoize from 'fast-memoize';

import { valueProps } from 'app/pages/game-edit/components/select-items/select-items.types';

import SelectUi from './select-ui';
import { getSearchResults, getNextSuggest, getPrevSuggest } from './select.helper';

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
};

const defaultProps = {
  selected: undefined,
  changedValues: undefined,
  availableItemsLoading: undefined,
  searchAvailableItems: undefined,
};

@hot(module)
class EditModalSelectObject extends React.Component {
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
    };

    this.onClickOnItem = memoize(this.onClickOnItem);
  }

  componentDidUpdate(previousProperties, previousState) {
    if (previousProperties.selected !== this.props.selected && this.props.selected) {
      this.selectRef.current.setInputFocused();
    }

    if (this.state.selectedSuggest !== previousState.selectedSuggest && this.state.selectedSuggest) {
      const suggests = this.getSearchResults();
      const idx = findIndex(propEq('id', this.state.selectedSuggest.id), suggests);
      this.selectRef.current.scrollAvailableItemsEl(41 * idx);
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
    const { selectedSuggest } = this.state;
    const suggests = this.getSearchResults();

    if (event.key === 'Enter' && (selectedSuggest || suggests.length > 0)) {
      this.saveItem(selectedSuggest || suggests[0]);
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

  onClickOnAddItem = () => {
    const { inputVal } = this.state;
    this.saveItem(inputVal);
  };

  hideSuggest = () => {
    this.setState({ showSuggests: false });
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

    return getNextSuggest(current, suggests);
  };

  getPrevSuggest = (current) => {
    const suggests = this.getSearchResults();

    return getPrevSuggest(current, suggests);
  };

  showSuggestsIfNotShowed = () => {
    if (!this.state.showSuggests) {
      this.setState({ showSuggests: true });
    }
  };

  /* eslint-disable-next-line react/sort-comp */
  searchSuggests = debounce((query) => {
    const { dispatch, searchAvailableItems } = this.props;

    dispatch(searchAvailableItems(query));
  }, 500);

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

  isSuggestsVisible(searchResults) {
    const { showSuggests } = this.state;
    const { searchAvailableItems, availableItemsLoading } = this.props;

    return (
      (!searchAvailableItems && showSuggests && searchResults.length > 0) ||
      ((searchAvailableItems || availableItemsLoading) && showSuggests)
    );
  }

  render() {
    const { inputVal, selectedSuggest } = this.state;
    const { name, availableItemsLoading } = this.props;

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
        type="objects"
        availableItemsLoading={availableItemsLoading}
        ref={this.selectRef}
      />
    );
  }
}

export default EditModalSelectObject;
