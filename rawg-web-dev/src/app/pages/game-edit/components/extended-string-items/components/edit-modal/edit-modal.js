import React from 'react';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import find from 'lodash/find';
import noop from 'lodash/noop';

import intlShape from 'tools/prop-types/intl-shape';

import trans from 'tools/trans';

import GameEditModal from 'app/pages/game-edit/components/modal';
import AddedItems from 'app/pages/game-edit/components/added-items';
import Button from 'app/ui/button';

import './edit-modal.styl';
import { resetField, unmarkValueDeleted } from 'app/pages/game-edit/actions/common';
import { viewStoreNotFoundError } from 'app/pages/game-edit/actions/stores';
import { ItemsTypes } from 'app/pages/game-edit/components/added-items/added-items.helper';

@injectIntl
@hot(module)
class ExtendedStringsEditModal extends React.Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
    dispatch: PropTypes.func.isRequired,
    currentValues: PropTypes.arrayOf(PropTypes.object).isRequired,
    changedValues: PropTypes.arrayOf(PropTypes.object),
    deletedValues: PropTypes.arrayOf(PropTypes.number).isRequired,
    availableItems: PropTypes.arrayOf(PropTypes.object).isRequired,
    title1: PropTypes.node.isRequired,
    title2: PropTypes.node.isRequired,
    placeholder: PropTypes.node.isRequired,
    desc: PropTypes.node,
    alreadyAddedTitle: PropTypes.node.isRequired,
    onClose: PropTypes.func.isRequired,
    selected: PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
      url: PropTypes.string,
    }),
    onSaveItem: PropTypes.func.isRequired,
    onItemClick: PropTypes.func,
    intl: intlShape.isRequired,
    forbidEditCurrentItems: PropTypes.bool,
  };

  static defaultProps = {
    desc: undefined,
    selected: undefined,
    changedValues: undefined,
    onItemClick: noop,
    forbidEditCurrentItems: false,
  };

  constructor(props) {
    super(props);

    const { selected } = this.props;

    this.state = {
      inputValue: selected ? selected.url : '',
      selected,
    };
  }

  onAddClick = () => {
    this.saveItem(this.state.inputValue);
  };

  onCancelClick = () => {
    this.props.dispatch(resetField(this.props.name));
    this.props.onClose();
  };

  onSaveClick = () => {
    const { name, currentValues, deletedValues, availableItems, dispatch } = this.props;

    if (this.inputElement) {
      const url = this.inputElement.value;
      const store = find(availableItems, (item) => this.isAvailableStore(item, url));

      if (store) {
        const existedStore = find(currentValues, (itm) => itm.id === store.id);
        const isDeletedStore = find(deletedValues, (id) => id === store.id);

        const item = {
          ...store,
          url,
          resourceId: existedStore ? existedStore.resourceId : undefined,
        };

        if (isDeletedStore) {
          dispatch(unmarkValueDeleted(name, store.id));
        }

        this.saveItem(item);
      } else {
        dispatch(viewStoreNotFoundError());
      }
    }
  };

  onEnterKeydown = (event) => {
    if (event.key === 'Enter') {
      this.onSaveClick();
    }
  };

  onInputChange = () => {
    this.setState({ inputValue: this.inputElement.value });
  };

  onItemClick = (item) => {
    const { onItemClick } = this.props;
    const { selected } = this.state;

    if (selected && selected.id === item.id) {
      this.setState({ inputValue: '', selected: undefined });
    } else {
      this.setState({ inputValue: item.url, selected: item });
    }

    onItemClick(item);
  };

  onDeleteClick = () => {
    this.reselectItem();
  };

  saveItem = (item) => {
    const { onSaveItem } = this.props;

    if (item) {
      onSaveItem(item);
      this.reselectItem();
    }
  };

  reselectItem = () => {
    this.setState({ inputValue: '', selected: undefined });
  };

  isAvailableStore = (item, url) => {
    if (!url) return false;

    const parseUrl = url.match(/^(?:ht{2}ps?:\/{2})?(?:[^\n@]+@)?(?:w{3}\.)?([^\n/:=?]+\/)/im);
    const itemDomain = item.domain.replace(/^http(s?):\/\//, '');
    const domain = parseUrl && parseUrl.length > 1 ? parseUrl[1] : 'err';

    return domain.slice(0, -1).includes(itemDomain);
  };

  renderErrorMessage(error) {
    const { intl } = this.props;

    const message = error.errors
      ? error.errors.url || error.errors.store
      : intl.formatMessage({ id: 'game_edit.update_info_failed_message' });

    return <div className="game-edit__extended-string-items__modal__error">{message}</div>;
  }

  renderFields() {
    const { intl } = this.props;

    const { inputValue, selected } = this.state;

    return (
      <>
        {selected && selected.err && this.renderErrorMessage(selected.err)}
        <div className="game-edit__extended-string-items__modal__form">
          <div className="game-edit__extended-string-items__modal__input">
            <input
              ref={(element) => {
                this.inputElement = element;
              }}
              name="url"
              placeholder={intl.formatMessage({ id: 'game_edit.field_url_placeholder' })}
              value={inputValue || ''}
              onChange={this.onInputChange}
              onKeyDown={this.onEnterKeydown}
            />
          </div>
          <Button
            className="game-edit__extended-string-items__modal__add-btn"
            onClick={this.onSaveClick}
            onKeyDown={this.onEnterKeydown}
            disabled={!inputValue}
            loading={false}
          >
            {selected ? trans('game_edit.field_stores_update_label') : trans('game_edit.field_stores_add')}
          </Button>
        </div>
      </>
    );
  }

  render() {
    const {
      name,
      dispatch,
      title1,
      title2,
      onClose,
      desc,
      forbidEditCurrentItems,
      alreadyAddedTitle,
      currentValues,
      changedValues,
      deletedValues,
      placeholder,
    } = this.props;

    const { selected } = this.state;

    return (
      <GameEditModal
        title1={title1}
        title2={title2}
        desc={desc}
        onClose={onClose}
        onSave={onClose}
        onCancel={this.onCancelClick}
      >
        {this.renderFields()}
        <div className="game-edit__extended-string-items__modal__items-title">{alreadyAddedTitle}</div>
        <div className="game-edit__extended-string-items__modal__items">
          <AddedItems
            type={ItemsTypes.OBJECT}
            name={name}
            dispatch={dispatch}
            changedValues={changedValues}
            currentValues={currentValues}
            deletedValues={deletedValues}
            selected={selected}
            placeholder={placeholder}
            onItemClick={this.onItemClick}
            onDeleteClick={this.onDeleteClick}
            forbidEditCurrentItems={forbidEditCurrentItems}
          />
        </div>
      </GameEditModal>
    );
  }
}

export default ExtendedStringsEditModal;
