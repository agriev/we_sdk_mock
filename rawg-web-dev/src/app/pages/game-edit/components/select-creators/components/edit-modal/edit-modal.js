import React from 'react';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';

import propEq from 'ramda/src/propEq';
import evolve from 'ramda/src/evolve';
import reject from 'ramda/src/reject';
import append from 'ramda/src/append';

import noop from 'lodash/noop';

import intlShape from 'tools/prop-types/intl-shape';

import { ItemsTypes } from 'app/pages/game-edit/components/added-items/added-items.helper';

import GameEditModal from 'app/pages/game-edit/components/modal';
import AddedItems from 'app/pages/game-edit/components/added-items';

import './edit-modal.styl';
import { resetField } from 'app/pages/game-edit/actions/common';

import EditModalCheckboxes from './components/checkboxes';
import EditModalSelect from './components/select';

@injectIntl
@hot(module)
class SelectCreatorsEditModal extends React.Component {
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
    selectedDesc: PropTypes.node,
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
    getItemLabel: PropTypes.func,
    intl: intlShape.isRequired,
    forbidEditCurrentItems: PropTypes.bool,
    availableItemsLoading: PropTypes.bool.isRequired,
    searchAvailableItems: PropTypes.func.isRequired,
    positions: PropTypes.arrayOf(PropTypes.object).isRequired,
  };

  static defaultProps = {
    desc: undefined,
    selectedDesc: undefined,
    selected: undefined,
    changedValues: undefined,
    getItemLabel: undefined,
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
    this.onSelectItem(this.state.inputValue);
  };

  onCancelClick = () => {
    this.props.dispatch(resetField(this.props.name));
    this.props.onClose();
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
    this.resetSelect();
  };

  onSelectItem = (item) => {
    const { onSaveItem } = this.props;

    if (item) {
      onSaveItem(item);

      this.resetSelect();
    }
  };

  onClickOnPosition = (position) => {
    const { selected } = this.state;
    const { onSaveItem } = this.props;

    const slugEq = propEq('slug', position.slug);
    const thatPositionIsChecked = selected.positions.some(slugEq);
    const updatedItem = evolve(
      {
        positions: thatPositionIsChecked ? reject(slugEq) : append(position),
      },
      selected,
    );

    onSaveItem(updatedItem);

    this.setState({ selected: updatedItem });
  };

  resetSelect = () => {
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

    return <div className="game-edit__select-creators__modal__error">{message}</div>;
  }

  renderSearchSelect() {
    const {
      name,
      availableItems,
      currentValues,
      changedValues,
      availableItemsLoading,
      searchAvailableItems,
      dispatch,
    } = this.props;

    const { selected } = this.state;

    if (selected) {
      return null;
    }

    return (
      <div className="game-edit__select-creators__modal__input">
        <EditModalSelect
          name={name}
          currentValues={currentValues}
          changedValues={changedValues}
          availableItems={availableItems}
          availableItemsLoading={availableItemsLoading}
          searchAvailableItems={searchAvailableItems}
          saveItem={this.onSelectItem}
          dispatch={dispatch}
        />
      </div>
    );
  }

  renderRolesSelect() {
    const { positions } = this.props;
    const { selected } = this.state;

    if (!selected) {
      return null;
    }

    return (
      <div className="game-edit__select-creators__modal__checkboxes">
        <EditModalCheckboxes saveItem={this.onClickOnPosition} selectedItems={selected.positions} items={positions} />
      </div>
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
      selectedDesc,
      forbidEditCurrentItems,
      alreadyAddedTitle,
      currentValues,
      changedValues,
      deletedValues,
      placeholder,
      getItemLabel,
    } = this.props;

    const { selected } = this.state;

    const descStr = selected ? selectedDesc(selected) : desc;

    return (
      <GameEditModal
        title1={title1}
        title2={title2}
        desc={descStr}
        onClose={onClose}
        onSave={onClose}
        onCancel={this.onCancelClick}
      >
        {this.renderSearchSelect()}
        {this.renderRolesSelect()}
        <div className="game-edit__select-creators__modal__items-title">{alreadyAddedTitle}</div>
        <div className="game-edit__select-creators__modal__items">
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
            getItemLabel={getItemLabel}
            forbidEditCurrentItems={forbidEditCurrentItems}
          />
        </div>
      </GameEditModal>
    );
  }
}

export default SelectCreatorsEditModal;
