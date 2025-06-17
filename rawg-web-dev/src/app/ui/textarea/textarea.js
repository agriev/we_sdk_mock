import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import omit from 'lodash/omit';

import Error from 'app/ui/error';

import './textarea.styl';

class Textarea extends React.Component {
  static propTypes = {
    maxLength: PropTypes.number,
    placeholder: PropTypes.string,
    meta: PropTypes.shape({
      error: PropTypes.string,
      touched: PropTypes.bool,
    }).isRequired,
    input: PropTypes.shape({
      value: PropTypes.string,
      onChange: PropTypes.func,
    }).isRequired,
  };

  static defaultProps = {
    maxLength: undefined,
    placeholder: undefined,
  };

  constructor(props) {
    super(props);

    this.state = {
      textLength: (props.input.value || '').length,
      value: props.input.value,
    };
  }

  static getDerivedStateFromProps(props, state) {
    const { input } = props;

    if (state.value !== input.value) {
      return {
        textLength: input.value.length,
        value: input.value,
      };
    }

    return null;
  }

  onChange = (event) => {
    const { input, maxLength } = this.props;

    if (maxLength && event.target.value.length > maxLength) {
      // eslint-disable-next-line no-param-reassign
      event.target.value = event.target.value.substring(0, maxLength);
    }

    this.setState({
      textLength: event.target.value.length,
      value: event.target.value,
    });

    input.onChange(event);
  };

  renderFieldCounter() {
    const { maxLength } = this.props;
    const remainder = maxLength - this.state.textLength;

    const className = classnames('textarea__counter', {
      textarea__counter_warning: remainder <= 10,
    });

    return <div className={className}>{remainder}</div>;
  }

  render = () => {
    const { meta, placeholder, input, maxLength } = this.props;
    const { value } = this.state;

    const error = meta.touched && meta.error;
    const className = classnames('textarea', {
      textarea_error: error,
    });

    const inputProperties = omit(input, ['onChange', 'value']);

    return (
      <div className={className}>
        <textarea
          className={classnames('textarea__field', {
            'textarea__field_max-width': maxLength,
          })}
          placeholder={placeholder}
          {...inputProperties}
          onChange={this.onChange}
          value={value}
        />
        {maxLength && this.renderFieldCounter()}
        {error && (
          <div className="textarea__error">
            <Error error={error} kind="field" />
          </div>
        )}
      </div>
    );
  };
}

export default Textarea;
