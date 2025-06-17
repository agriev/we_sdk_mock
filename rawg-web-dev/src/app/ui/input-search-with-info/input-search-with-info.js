import React, { useCallback, useRef } from 'react';
import PropTypes from 'prop-types';

import './input-search-with-info.styl';

import Button from 'app/ui/button';
import InputSearch from 'app/ui/input-search';

import debounce from 'lodash/debounce';
import noop from 'lodash/noop';

const propTypes = {
  value: PropTypes.string,
  counter: PropTypes.node,
  onSearch: PropTypes.func,
  onReset: PropTypes.func,
  placeholder: PropTypes.string,
  autoFocus: PropTypes.bool,
  alwaysShowClose: PropTypes.bool,
};

const defaultProps = {
  value: '',
  counter: undefined,
  onSearch: noop,
  onReset: noop,
  placeholder: undefined,
  autoFocus: false,
  alwaysShowClose: false,
};

const ImportSearchWithInfo = ({ value, counter, onSearch, onReset, placeholder, autoFocus, alwaysShowClose }) => {
  const onSearchDebounced = useCallback(debounce(onSearch, 500), []);
  const inputReference = useRef(null);
  const resetSearch = useCallback(() => {
    if (inputReference.current) {
      inputReference.current.resetInput();
    }
    onReset();
  }, []);

  return (
    <div className="input-search-with-info">
      <div className="input-search-with-info__wrap">
        <InputSearch
          value={value}
          onChange={onSearchDebounced}
          className="input-search-with-info__input-search"
          placeholder={placeholder}
          ref={inputReference}
          autoFocus={autoFocus}
        />
        {(value || alwaysShowClose) && (
          <Button kind="fill" size="small" className="input-search-with-info__reset-button" onClick={resetSearch} />
        )}
      </div>
      {counter && <div className="input-search-with-info__counter">{counter}</div>}
    </div>
  );
};

ImportSearchWithInfo.propTypes = propTypes;

ImportSearchWithInfo.defaultProps = defaultProps;

export default ImportSearchWithInfo;
