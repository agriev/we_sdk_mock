import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import './field-status.styl';

const hoc = compose(hot(module));

const componentPropertyTypes = {
  className: PropTypes.string,
  message: PropTypes.shape({
    messageID: PropTypes.string,
    values: PropTypes.shape({}),
  }).isRequired,
};

const defaultProps = {
  className: '',
};

const FieldStatusComponent = ({ className, message: { messageID, values } }) =>
  messageID.length > 0 ? (
    <div className={['field-status', className].join(' ')}>
      <div className="field-status__icon">!</div>
      <SimpleIntlMessage className="field-status__text" id={messageID} values={values} />
    </div>
  ) : null;

FieldStatusComponent.propTypes = componentPropertyTypes;
FieldStatusComponent.defaultProps = defaultProps;

const FieldStatus = hoc(FieldStatusComponent);

export default FieldStatus;
