import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader';
import { compose } from 'recompose';
import { Link } from 'app/components/link';
import env from 'config/env';

import { JOIN_ERROR_NO_ACCOUNTS, JOIN_ERROR_NO_CONFIRMED_ACCOUNTS } from 'app/pages/tokens/tokens.actions';

import paths from 'config/paths';

if (env.isClient()) {
  /*  eslint-disable global-require */
  require('./join-error.styl');
}

const hoc = compose(hot(module));

const componentPropertyTypes = {
  text: PropTypes.string,
  code: PropTypes.number,
};

const defaultProps = {
  text: '',
  code: undefined,
};

const JoinErrorComponent = ({ text, code }) => {
  if (!code) {
    return null;
  }

  return (
    <div className="tokens__join-error">
      <div key="message" className="tokens__join-error-text">
        <FormattedMessage id="tokens.join_error" values={{ code, text }} />
      </div>
      {code === JOIN_ERROR_NO_ACCOUNTS && (
        <Link key="link-accounts" to={paths.gameAccounts} href={paths.gameAccounts}>
          <FormattedMessage id="tokens.link_game_accounts" />
        </Link>
      )}
      {code === JOIN_ERROR_NO_CONFIRMED_ACCOUNTS && (
        <Link key="verify-accounts" to={paths.gameAccountsVerification} href={paths.gameAccountsVerification}>
          <FormattedMessage id="tokens.verify_game_accounts" />
        </Link>
      )}
    </div>
  );
};

JoinErrorComponent.propTypes = componentPropertyTypes;
JoinErrorComponent.defaultProps = defaultProps;

const JoinError = hoc(JoinErrorComponent);

export default JoinError;
