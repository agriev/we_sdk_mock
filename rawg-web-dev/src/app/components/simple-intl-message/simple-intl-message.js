import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';
import { injectIntl } from 'react-intl';

import intlShape from 'tools/prop-types/intl-shape';

const hoc = compose(
  hot(module),
  injectIntl,
);

const componentPropertyTypes = {
  className: PropTypes.string,
  intl: intlShape.isRequired,
  id: PropTypes.string.isRequired,
  values: PropTypes.shape(),
};

const defaultProps = {
  className: '',
};

const renderString = (id, values, intl) => <>{intl.formatMessage({ id }, values)}</>;

const renderSpan = (id, values, intl, className) => (
  <span className={className}>{intl.formatMessage({ id }, values)}</span>
);

const SimpleIntlMessageComponent = ({ className, intl, id, values }) =>
  className.length > 0 ? renderSpan(id, values, intl, className) : renderString(id, values, intl);

SimpleIntlMessageComponent.propTypes = componentPropertyTypes;
SimpleIntlMessageComponent.defaultProps = defaultProps;

const SimpleIntlMessage = hoc(SimpleIntlMessageComponent);

export default SimpleIntlMessage;
