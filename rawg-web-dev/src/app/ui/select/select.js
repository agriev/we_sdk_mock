import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Dropdown from 'app/ui/dropdown';

import SelectButton, { selectButtonPropTypes } from './select-button';
import SelectContent, { selectContentPropTypes } from './select-content';

import './select.styl';

export const selectPropTypes = {
  button: PropTypes.shape(selectButtonPropTypes),
  content: PropTypes.shape(selectContentPropTypes),
  renderButton: PropTypes.func,
  renderContent: PropTypes.func,
  multiple: PropTypes.bool,
  buttonValue: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  onOpen: PropTypes.func,
  onChange: PropTypes.func,
  onChangeChild: PropTypes.func,
  onClose: PropTypes.func,
  closeOnClick: PropTypes.bool,
  saveActive: PropTypes.bool,
  kind: PropTypes.string,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  onlyArrow: PropTypes.bool,
  closeOnScroll: PropTypes.bool,
  linkable: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  urlBase: PropTypes.string,
  useOnlyButtonValue: PropTypes.bool,
  widthAsButton: PropTypes.bool,
  filters: PropTypes.shape(),
};

const selectDefaultProperties = {
  button: {},
  content: {},
  renderButton: undefined,
  renderContent: undefined,
  multiple: false,
  buttonValue: undefined,
  onOpen: undefined,
  onChange: undefined,
  onChangeChild: undefined,
  onClose: undefined,
  closeOnClick: false,
  saveActive: true,
  kind: undefined,
  className: '',
  containerClassName: '',
  onlyArrow: false,
  closeOnScroll: false,
  linkable: false,
  urlBase: undefined,
  useOnlyButtonValue: false,
  widthAsButton: false,
  filters: undefined,
};

export default class Select extends Component {
  static propTypes = selectPropTypes;

  static defaultProps = selectDefaultProperties;

  constructor(props) {
    super(props);

    const { buttonValue } = props;

    this.selectButton = React.createRef();

    this.state = {
      opened: false,
      value: buttonValue,
    };
  }

  static getDerivedStateFromProps(props, state) {
    const { buttonValue } = props;

    if (state.value !== buttonValue) {
      return {
        value: buttonValue,
      };
    }

    return null;
  }

  handleChange = ({ activeItems, isClean }) => {
    const { multiple, onChange, closeOnClick, useOnlyButtonValue, buttonValue } = this.props;

    const firstSelectedValue = Array.isArray(activeItems) && activeItems.length > 0 ? activeItems[0].value : null;
    const value = useOnlyButtonValue ? buttonValue : firstSelectedValue;
    const opened = closeOnClick || isClean ? false : !!multiple;

    this.setState({ opened, value });

    if (typeof onChange === 'function') {
      onChange(activeItems, isClean);
    }
  };

  handleChangeChild = ({ activeChilds }) => {
    const { multiple, onChangeChild, closeOnClick } = this.props;
    const value = Array.isArray(activeChilds) && activeChilds.length > 0 ? activeChilds[0].value : null;
    const opened = closeOnClick ? false : !!multiple;

    this.setState({ opened, value });

    if (typeof onChangeChild === 'function') {
      onChangeChild(activeChilds);
    }
  };

  handleOpen = () => {
    const { onOpen } = this.props;

    this.setState({ opened: true });

    if (typeof onOpen === 'function') {
      onOpen();
    }
  };

  handleClose = () => {
    const { onClose } = this.props;

    this.setState({ opened: false });

    if (typeof onClose === 'function') {
      onClose();
    }
  };

  render() {
    const {
      button,
      content,
      multiple,
      className,
      containerClassName,
      renderButton,
      renderContent,
      kind,
      onlyArrow,
      saveActive,
      closeOnScroll,
      linkable,
      urlBase,
      widthAsButton,
      filters,
    } = this.props;

    const { value, opened } = this.state;

    const makeContent = () => {
      if (renderContent) {
        return renderContent;
      }
      return () => (
        <SelectContent
          multiple={multiple}
          saveActive={saveActive}
          {...content}
          onChange={this.handleChange}
          onChangeChild={this.handleChangeChild}
          linkable={linkable}
          urlBase={urlBase}
          filters={filters}
        />
      );
    };

    const makeButton = () => {
      if (renderButton) {
        return renderButton;
      }
      return () => (
        <SelectButton ref={this.selectButton} multiple={multiple} value={value} onlyArrow={onlyArrow} {...button} />
      );
    };

    return (
      <Dropdown
        renderButton={makeButton()}
        renderContent={makeContent()}
        opened={opened}
        onOpen={this.handleOpen}
        onClose={this.handleClose}
        className={className}
        containerClassName={containerClassName}
        kind={kind}
        closeOnScroll={closeOnScroll}
        sameWidth={widthAsButton ? 'button' : undefined}
      />
    );
  }
}
