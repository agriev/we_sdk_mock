import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader';
import { compose } from 'recompose';
import { connect } from 'react-redux';

import './join.styl';
import Button from 'app/ui/button/button';
import UserListLine from 'app/ui/user-list-line';
import currentUserType from 'app/components/current-user/current-user.types';

import {
  status as statusType,
  STATUS_ACTIVE,
  joined as joinedCountType,
  last_users as lastUsersType,
} from 'app/pages/tokens/tokens.types';
import { joinProgram as joinProgramAction } from 'app/pages/tokens/tokens.actions';
import JoinError from './components/join-error/join-error';

const hoc = compose(
  hot(module),
  connect(
    (state) => ({
      currentUser: state.currentUser,
      size: state.app.size,
      status: state.tokensDashboard.status,
      joinedCount: state.tokensDashboard.joined,
      lastUsers: state.tokensDashboard.last_users,
      joining: state.tokensDashboard.joining,
      joinErrorText: state.tokensDashboard.join_error_text,
      joinErrorCode: state.tokensDashboard.join_error_code,
    }),
    (dispatch) => ({
      joinProgram: (event) => {
        event.stopPropagation();
        event.preventDefault();
        dispatch(joinProgramAction());
      },
    }),
  ),
);

const componentPropertyTypes = {
  currentUser: currentUserType.isRequired,
  status: statusType.isRequired,
  joinedCount: joinedCountType.isRequired,
  lastUsers: lastUsersType.isRequired,
  joinProgram: PropTypes.func.isRequired,
  joining: PropTypes.bool.isRequired,
  joinErrorText: PropTypes.string,
  joinErrorCode: PropTypes.number,
};

const defaultProps = {
  joinErrorText: '',
  joinErrorCode: undefined,
};

const TokensDashboardJoin = ({
  currentUser,
  status,
  joinProgram,
  joinedCount,
  lastUsers,
  joining,
  joinErrorText,
  joinErrorCode,
}) => {
  if (currentUser.token_program || status !== STATUS_ACTIVE) {
    return null;
  }

  const joinedData = {
    results: lastUsers,
    count: joinedCount,
  };

  return (
    <div className="tokens__join">
      <div className="tokens__join-btn">
        <Button kind="fill" size="medium" onClickCapture={joinProgram} loading={joining}>
          <FormattedMessage id="tokens.join_n_rawgers" values={{ count: joinedCount }} />
          <UserListLine users={joinedData} noCount />
        </Button>
        <JoinError text={joinErrorText} code={joinErrorCode} />
      </div>
    </div>
  );
};

TokensDashboardJoin.propTypes = componentPropertyTypes;
TokensDashboardJoin.defaultProps = defaultProps;

export default hoc(TokensDashboardJoin);
