import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';
import { FormattedMessage } from 'react-intl';
import { connect } from 'react-redux';

import {
  STATUS_FAILURE,
  STATUS_COMPLETED,
  status as statusType,
  next as nextType,
  STATUS_ACTIVE,
} from 'app/pages/tokens/tokens.types';
import './notifications.styl';
import currentUserType from 'app/components/current-user/current-user.types';
import { calcTimeLeft } from 'app/pages/tokens/tokens.funcs';
import {
  remindByEmail as remindByEmailAction,
  joinProgram as joinProgramAction,
} from 'app/pages/tokens/tokens.actions';

const hoc = compose(
  hot(module),
  connect(
    (state) => ({
      status: state.tokensDashboard.status,
      next: state.tokensDashboard.next,
      currentUser: state.currentUser,
      joining: state.tokensDashboard.joining,
      joinErrorText: state.tokensDashboard.join_error_text,
      joinErrorCode: state.tokensDashboard.join_error_code,
    }),
    (dispatch) => ({
      remindByEmail: () => dispatch(remindByEmailAction()),
      joinProgram: () => dispatch(joinProgramAction()),
    }),
  ),
);

const componentPropertyTypes = {
  status: statusType.isRequired,
  next: nextType,
  currentUser: currentUserType.isRequired,
  remindByEmail: PropTypes.func.isRequired,
  joining: PropTypes.bool.isRequired,
  joinErrorText: PropTypes.string,
  joinErrorCode: PropTypes.number,
  joinProgram: PropTypes.func.isRequired,
};

const defaultProps = {
  joinErrorText: '',
  joinErrorCode: undefined,
  next: null,
};

const TokenProgramNotifications = ({
  status,
  currentUser,
  next,
  remindByEmail,
  joinProgram,
  joining,
  joinErrorText,
  joinErrorCode,
}) => {
  if (status === STATUS_ACTIVE || next === null || next.subscribed) {
    return null;
  }

  const [days, hours, mins] = calcTimeLeft(next.start);

  return (
    <div className="tokens-notifications">
      {[STATUS_COMPLETED, STATUS_FAILURE].includes(status) && (
        <div className="tokens-notification">
          <FormattedMessage id={`tokens.notifications_${status}`} />
          &nbsp;
          <strong>
            <FormattedMessage id="tokens.notifications_next_time_days" values={{ days }} />
            {hours && ' : '}
            {hours && <FormattedMessage id="tokens.notifications_next_time_hours" values={{ hours }} />}
            {mins && ' : '}
            {mins && <FormattedMessage id="tokens.notifications_next_time_mins" values={{ mins }} />}
          </strong>
          {currentUser.id > 0 && currentUser.token_program && !next.subscribed && (
            <span onClick={remindByEmail} className="tokens-notification__action-link" role="button" tabIndex={0}>
              <FormattedMessage id="tokens.notifications_action_remind" />
            </span>
          )}
          {currentUser.id > 0 && !currentUser.token_program && (
            <span className="tokens-notification__action-link" onClick={joinProgram} role="button" tabIndex={0}>
              {!joining && !joinErrorCode && <FormattedMessage id="tokens.notifications_action_join" />}
              {joining && !joinErrorCode && <FormattedMessage id="tokens.notifications_action_joining" />}
              {joinErrorCode && (
                <span title={joinErrorText}>
                  <FormattedMessage id="tokens.notifications_action_join_error" />
                </span>
              )}
            </span>
          )}
          {!currentUser.id && (
            <span className="tokens-notification__action-link">
              <FormattedMessage id="tokens.notifications_action_register_and_join" />
            </span>
          )}
        </div>
      )}
    </div>
  );
};

TokenProgramNotifications.propTypes = componentPropertyTypes;
TokenProgramNotifications.defaultProps = defaultProps;

export default hoc(TokenProgramNotifications);
