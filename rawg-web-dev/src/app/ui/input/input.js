import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import SVGInline from 'react-svg-inline';

import Error from 'app/ui/error';

import './input.styl';

const inputPropertyTypes = {
  inputIcon: PropTypes.string,
  onClickOnIcon: PropTypes.func,
  input: PropTypes.shape({
    name: PropTypes.string,
  }).isRequired,
  meta: PropTypes.shape({
    touched: PropTypes.bool.isRequired,
    error: PropTypes.string,
  }),
  type: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  autoComplete: PropTypes.string,
  disabled: PropTypes.bool,
  hideNameAttribute: PropTypes.bool,
};

const inputDefaultProperties = {
  inputIcon: undefined,
  onClickOnIcon: undefined,
  placeholder: '',
  autoComplete: undefined,
  disabled: false,
  hideNameAttribute: false,
  meta: undefined,
};

const Input = ({ meta, hideNameAttribute, input, inputIcon, type, placeholder, autoComplete, disabled }) => {
  const error = meta && meta.touched && meta.error;
  const className = classnames('input', {
    input_error: error,
  });

  const onClickOnIcon = () => {
    if (onClickOnIcon) {
      onClickOnIcon();
    }
  };

  const inputProperties = hideNameAttribute ? { ...input, name: undefined, 'data-name': input.name } : input;

  return (
    <div className={className}>
      <input
        className="input__field"
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        {...inputProperties}
      />
      {error && (
        <div className="input__error">
          <Error error={error} kind="field" />
        </div>
      )}
      {inputIcon && (
        <SVGInline
          onClick={onClickOnIcon}
          className={classnames('input__icon', { clickable: Boolean(onClickOnIcon) })}
          svg={inputIcon}
        />
      )}
    </div>
  );
};

Input.propTypes = inputPropertyTypes;
Input.defaultProps = inputDefaultProperties;

export default Input;
