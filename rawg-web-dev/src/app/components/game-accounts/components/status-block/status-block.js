import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';
import cn from 'classnames';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import './status-block.styl';

const hoc = compose(hot(module));

const componentPropertyTypes = {
  className: PropTypes.string,
  status: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

const defaultProps = {
  className: '',
};

const statusMessage = ({ status, name }) => {
  switch (status) {
    case 'ready':
      return (
        <SimpleIntlMessage
          className="account-card__description"
          id="game_accounts.text_connected"
          values={{ store: name }}
        />
      );
    case 'error':
      return <SimpleIntlMessage id="shared.game_accounts_form_error" />;
    case 'private-user':
    case 'private-games':
      return <SimpleIntlMessage id="game_accounts.import_private_error" values={{ account: name }} />;
    case 'unavailable':
      return <SimpleIntlMessage id="shared.game_accounts_form_unavailable" />;
    case 'process':
      return <SimpleIntlMessage id="shared.game_accounts_form_process" />;
    default:
      return <SimpleIntlMessage id="game_accounts.text" values={{ store: name }} />;
  }
};

statusMessage.propTypes = {
  status: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

statusMessage.defaultProps = {};

const StatusBlockComponent = ({ className, status, name }) => (
  <div
    className={cn(
      'status-block',
      {
        'status-block__error': status === 'error' || status === 'private-user' || status === 'private-games',
      },
      className,
    )}
  >
    {statusMessage({ status, name })}
  </div>
);

StatusBlockComponent.propTypes = componentPropertyTypes;
StatusBlockComponent.defaultProps = defaultProps;

const StatusBlock = hoc(StatusBlockComponent);

export default StatusBlock;
