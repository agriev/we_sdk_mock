import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';

import { valueProps } from 'app/pages/game-edit/components/select-items/select-items.types';

import CheckboxesUi from './checkboxes-ui';

const propTypes = {
  selectedItems: PropTypes.arrayOf(valueProps).isRequired,
  items: PropTypes.arrayOf(valueProps).isRequired,
  // dispatch: PropTypes.func.isRequired,
  saveItem: PropTypes.func.isRequired,
};

const defaultProps = {
  //
};

@hot(module)
class EditModalCheckboxes extends React.Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  onSelect = (item) => {
    this.props.saveItem(item);
  };

  render() {
    const { items, selectedItems } = this.props;

    return <CheckboxesUi items={items} selectedItems={selectedItems} ref={this.selectRef} onSelect={this.onSelect} />;
  }
}

export default EditModalCheckboxes;
