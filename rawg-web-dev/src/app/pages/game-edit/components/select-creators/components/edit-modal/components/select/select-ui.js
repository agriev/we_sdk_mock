import React from 'react';
import PropTypes from 'prop-types';
import noop from 'lodash/noop';

import cn from 'classnames';

import SimpleIntlMessage from 'app/components/simple-intl-message';
import Loading from 'app/ui/loading';

import { valueProps, typeProps } from 'app/pages/game-edit/components/select-items/select-items.types';

import { NEW_ITEM_KEY } from './select.helper';

import './select.styl';

const propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  onClick: PropTypes.func,
  onClickOnItem: PropTypes.func,
  onClickOnAddItem: PropTypes.func,
  hideSuggest: PropTypes.func,
  showSuggests: PropTypes.bool,
  showAddNewItem: PropTypes.bool,
  searchResults: PropTypes.arrayOf(valueProps),
  selectedSuggest: valueProps,
  type: typeProps.isRequired,
  availableItemsLoading: PropTypes.bool,
};

const defaultProps = {
  value: '',
  onKeyDown: noop,
  onFocus: noop,
  onBlur: noop,
  onClick: noop,
  hideSuggest: noop,
  onClickOnItem: noop,
  onClickOnAddItem: noop,
  showSuggests: false,
  showAddNewItem: false,
  searchResults: [],
  selectedSuggest: undefined,
  availableItemsLoading: false,
};

class EditModalSelect extends React.Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  componentDidMount() {
    this.setInputFocused();

    setTimeout(() => {
      window.addEventListener('click', this.onClickOnAnyPlace);
    }, 100);
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.onClickOnAnyPlace);
  }

  onClickOnAnyPlace = (event) => {
    if (!this.props.showSuggests) {
      return;
    }

    const root = this.rootEl;

    if (root !== event.target && !root.contains(event.target)) {
      this.props.hideSuggest();
    }
  };

  onClickOnRootEl = () => {
    this.setInputFocused();
  };

  inputRef = (element) => {
    this.input = element;
  };

  availableItemsRef = (element) => {
    this.availableItemsEl = element;
  };

  rootRef = (element) => {
    this.rootEl = element;
  };

  setInputFocused = () => {
    this.input.focus();
  };

  scrollAvailableItemsEl = (value) => {
    if (this.availableItemsEl) {
      this.availableItemsEl.scrollTop = value;
    }
  };

  isItemSelected = (item) => {
    const { selectedSuggest, type } = this.props;
    return selectedSuggest && (type === 'strings' ? selectedSuggest === item : selectedSuggest.id === item.id);
  };

  renderSuggestedItem = (item) => {
    const { onClickOnItem, type } = this.props;

    return (
      <div
        key={type === 'strings' ? item : item.id}
        className={cn('game-edit__select-items__modal__select__available-item', {
          'game-edit__select-items__modal__select__available-item_selected': this.isItemSelected(item),
        })}
        onClick={onClickOnItem(item)}
        role="button"
        tabIndex={0}
      >
        {type === 'strings' ? item : item.name}
      </div>
    );
  };

  renderAddNewItem() {
    const { name, value, onClickOnAddItem } = this.props;

    return (
      <div
        key="new item"
        className={cn('game-edit__select-items__modal__select__new-item', {
          'game-edit__select-items__modal__select__new-item_selected': this.isItemSelected(NEW_ITEM_KEY),
        })}
        onClick={onClickOnAddItem}
        role="button"
        tabIndex={0}
      >
        <SimpleIntlMessage id="game_edit.have_not_item" values={{ name: name.slice(0, -1), value }} />
        <SimpleIntlMessage className="game-edit__select-items__modal__select__create" id="game_edit.create_item" />
      </div>
    );
  }

  renderLoading() {
    return <Loading className="game-edit__select-items__modal__select__available-items__loading" size="small" />;
  }

  render() {
    const {
      value,
      onChange,
      onKeyDown,
      onFocus,
      onBlur,
      onClick,
      showSuggests,
      showAddNewItem,
      searchResults,
      availableItemsLoading,
    } = this.props;

    return (
      <div
        className={cn('game-edit__select-items__modal__select', {
          'game-edit__select-items__modal__select_with-suggests': showSuggests,
        })}
        ref={this.rootRef}
        onClickCapture={this.onClickOnRootEl}
        role="button"
        tabIndex={0}
      >
        <input
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          onClick={onClick}
          ref={this.inputRef}
        />
        {showSuggests && (
          <div className="game-edit__select-items__modal__select__available-items" ref={this.availableItemsRef}>
            {searchResults.map(this.renderSuggestedItem)}
            {availableItemsLoading && this.renderLoading()}
            {showAddNewItem && this.renderAddNewItem()}
          </div>
        )}
      </div>
    );
  }
}

export default EditModalSelect;
