import React from 'react';
import { FormattedMessage, FormattedHTMLMessage } from 'react-intl';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';
import cn from 'classnames';
import { connect } from 'react-redux';

import Heading from 'app/ui/heading';

import './head.styl';
import currentUserType from 'app/components/current-user/current-user.types';
import { status as statusType } from 'app/pages/tokens/tokens.types';

const hoc = compose(
  hot(module),
  connect((state) => ({
    status: state.tokensDashboard.status,
    currentUser: state.currentUser,
  })),
);

const componentPropertyTypes = {
  status: statusType.isRequired,
  currentUser: currentUserType.isRequired,
};

const TokensDashboardHead = ({ status, currentUser }) => (
  <div className={cn('tokens__head-container', `tokens__head-container_${status}`)}>
    <div className="tokens__head__money__container">
      <div className="tokens__head__money" />
    </div>
    <div className="tokens__head">
      <Heading rank={1}>
        <FormattedHTMLMessage id={`tokens.head_h1_${status}`} />
      </Heading>
      <p className="tokens__head__desc">
        <FormattedMessage id={`tokens.head_desc_${status}_${currentUser.id ? 'logged' : 'guest'}`} />
      </p>
    </div>
  </div>
);

TokensDashboardHead.propTypes = componentPropertyTypes;

export default hoc(TokensDashboardHead);
