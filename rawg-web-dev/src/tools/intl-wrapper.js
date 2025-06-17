import React from 'react';
import PropTypes from 'prop-types';
import { IntlProvider } from 'react-intl';
import { connect } from 'react-redux';
import { compose } from 'recompose';

import { messages as appMessagesType, appLocaleType } from 'app/pages/app/app.types';

const hoc = compose(
  connect((state) => ({
    messages: state.app.messages,
    locale: state.app.locale,
  })),
);

const componentPropertyTypes = {
  children: PropTypes.node.isRequired,
  messages: appMessagesType.isRequired,
  locale: appLocaleType.isRequired,
};

const defaultProps = {};

const IntlWrapperComponent = ({ children, messages, locale }) => (
  <IntlProvider locale={locale} messages={messages}>
    {children}
  </IntlProvider>
);

IntlWrapperComponent.propTypes = componentPropertyTypes;
IntlWrapperComponent.defaultProps = defaultProps;

const IntlWrapper = hoc(IntlWrapperComponent);

export default IntlWrapper;
