import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader';
import { compose } from 'recompose';
import { connect } from 'react-redux';

import currentUserType from 'app/components/current-user/current-user.types';

import './next.styl';
import Button from 'app/ui/button';
import { appSizeType } from 'app/pages/app/app.types';
import appHelper from 'app/pages/app/app.helper';
import { calcTimeLeft } from 'app/pages/tokens/tokens.funcs';
import {
  remindByEmail as remindByEmailAction,
  joinProgram as joinProgramAction,
} from 'app/pages/tokens/tokens.actions';
import tokensDashboardTypes, { STATUS_ACTIVE, STATUS_COMPLETED } from 'app/pages/tokens/tokens.types';
import JoinError from '../join/components/join-error/join-error';

const hoc = compose(
  hot(module),
  connect(
    (state) => ({
      currentUser: state.currentUser,
      tokensDashboard: state.tokensDashboard,
      size: state.app.size,
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
  tokensDashboard: tokensDashboardTypes.isRequired,
  currentUser: currentUserType.isRequired,
  remindByEmail: PropTypes.func.isRequired,
  size: appSizeType.isRequired,
  joinProgram: PropTypes.func.isRequired,
  joining: PropTypes.bool.isRequired,
  joinErrorText: PropTypes.string,
  joinErrorCode: PropTypes.number,
};

const defaultProps = {
  joinErrorText: '',
  joinErrorCode: undefined,
};

const TokensNextCycle = ({
  currentUser,
  tokensDashboard,
  remindByEmail,
  size,
  joinProgram,
  joining,
  joinErrorText,
  joinErrorCode,
}) => {
  const { status, next, subscribing } = tokensDashboard;

  if (status === STATUS_ACTIVE || next === null) {
    return null;
  }

  if (status === STATUS_COMPLETED && currentUser.token_program) {
    return null;
  }

  const [days, hours, mins] = calcTimeLeft(next.start);

  return (
    <div className="tokens__next-starts">
      <div className="tokens__next-starts__title">
        <FormattedMessage id="tokens.starts_title" />
      </div>
      <div className="tokens__next-starts__time">
        {appHelper.isDesktopSize({ size }) && (
          <div>
            {days > 0 && <FormattedMessage id="tokens.notifications_next_time_days" values={{ days }} />}
            {hours && ' : '}
            {hours && <FormattedMessage id="tokens.notifications_next_time_hours" values={{ hours }} />}
            {mins && ' : '}
            {mins && <FormattedMessage id="tokens.notifications_next_time_mins" values={{ mins }} />}
          </div>
        )}
        {appHelper.isPhoneSize({ size }) && (
          <div>
            <div>{days > 0 && <FormattedMessage id="tokens.notifications_next_time_days" values={{ days }} />}</div>
            {hours && (
              <div>
                <FormattedMessage id="tokens.notifications_next_time_hours" values={{ hours }} />
              </div>
            )}
            {mins && (
              <div>
                <FormattedMessage id="tokens.notifications_next_time_mins" values={{ mins }} />
              </div>
            )}
          </div>
        )}
      </div>
      {currentUser.id && currentUser.token_program && (!next.subscribed || next.subscribed) && (
        <Button
          className="tokens__next-starts__remind-by-email-btn"
          kind="fill"
          size="medium"
          onClick={remindByEmail}
          loading={subscribing}
          disabled={subscribing}
        >
          <FormattedMessage id="tokens.notifications_action_remind" />
        </Button>
      )}
      {!currentUser.token_program && [
        <Button
          key="button"
          className="tokens__next-starts__join-btn"
          kind="fill"
          size="medium"
          onClick={joinProgram}
          loading={joining}
          disabled={joining}
        >
          <FormattedMessage id="tokens.join" />
        </Button>,
        <JoinError key="error" text={joinErrorText} code={joinErrorCode} />,
        !currentUser.id && (
          <div key="text" className="tokens__next-starts__join-text">
            <FormattedMessage id="tokens.notifications_action_join_desc" />
          </div>
        ),
      ]}
    </div>
  );
};

TokensNextCycle.propTypes = componentPropertyTypes;
TokensNextCycle.defaultProps = defaultProps;

export default hoc(TokensNextCycle);
