import React from 'react';
import PropTypes from 'prop-types';

import includes from 'ramda/src/includes';
import prop from 'ramda/src/prop';

import './checkboxes.styl';

import Checkbox from 'app/ui/checkbox';

const propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedItems: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSelect: PropTypes.func.isRequired,
};

const defaultProps = {
  //
};

const EditModalCheckboxesUi = ({ items, selectedItems, onSelect }) => {
  const selectedItemsSlugs = selectedItems.map(prop('slug'));
  const getClickHandler = (item) => () => onSelect(item);

  return (
    <div className="game-edit__select-items__modal__checkboxes" role="button" tabIndex={0}>
      {items.map((item) => (
        <Checkbox
          key={item.slug}
          checked={includes(item.slug, selectedItemsSlugs)}
          onChange={getClickHandler(item)}
          label={item.name}
        />
      ))}
    </div>
  );
};

EditModalCheckboxesUi.propTypes = propTypes;

EditModalCheckboxesUi.defaultProps = defaultProps;

export default EditModalCheckboxesUi;
