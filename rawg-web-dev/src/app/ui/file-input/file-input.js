import React from 'react';
import PropTypes from 'prop-types';

export default class FileInput extends React.Component {
  static propTypes = {
    input: PropTypes.shape().isRequired,
  };

  onChange = (e) => {
    this.props.input.onChange(e.target.files[0]);
  };

  render() {
    return <input className="file-input__field" type="file" autoComplete="off" onChange={this.onChange} />;
  }
}
