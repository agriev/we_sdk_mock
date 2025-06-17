import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';

import { valueProps, typeProps } from 'app/pages/game-edit/components/select-items/select-items.types';

import SelectString from './select-string';
import SelectObject from './select-object';

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
  type: typeProps.isRequired,
};

const defaultProps = {
  selected: undefined,
  changedValues: undefined,
  availableItemsLoading: undefined,
  searchAvailableItems: undefined,
};

@hot(module)
class EditModalSelect extends React.Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  render() {
    const { type } = this.props;

    return type === 'strings' ? <SelectString {...this.props} /> : <SelectObject {...this.props} />;
  }
}

export default EditModalSelect;
