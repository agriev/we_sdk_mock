/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { reduxForm, Field } from 'redux-form';
import cn from 'classnames';
import { injectIntl } from 'react-intl';
import SVGInline from 'react-svg-inline';

import { sendAnalyticsGamesImport } from 'scripts/analytics-helper';
import throwValidationError from 'tools/throw-validation-error';

import intlShape from 'tools/prop-types/intl-shape';

import includes from 'lodash/includes';

import equals from 'ramda/src/equals';
import cond from 'ramda/src/cond';
import always from 'ramda/src/always';
import T from 'ramda/src/T';

import Input from 'app/ui/input';
import Error from 'app/ui/error';
import Button from 'app/ui/button';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import { changeGameAccounts } from 'app/components/game-accounts/game-accounts.actions';
import StatusBlock from 'app/components/game-accounts/components/status-block/status-block';

import { PROFILE_GAMES_IMPORT_SUBMIT } from 'app/pages/profile/profile.actions';
import './import-form.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  intl: intlShape.isRequired,
  icon: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  slug: PropTypes.string.isRequired,
  account: PropTypes.string.isRequired,
  accountId: PropTypes.string.isRequired,
  error: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.func]),
  submitting: PropTypes.bool.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  initialize: PropTypes.func.isRequired,
  dispatch: PropTypes.func.isRequired,
  status: PropTypes.string.isRequired,
  id: PropTypes.string,
};

const defaultProps = {
  className: '',
  error: undefined,
  id: '',
};

@reduxForm({
  form: 'gameAccounts',
  persistentSubmitErrors: true,
})
@injectIntl
@connect((state) => ({
  currentUser: state.currentUser,
}))
class ImportForm extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    const { dispatch, initialize, accountId, id } = this.props;

    dispatch(initialize({ [accountId]: id }));
  }

  submit = (values, dispatch) => {
    dispatch({ type: PROFILE_GAMES_IMPORT_SUBMIT });

    return dispatch(changeGameAccounts(values, { redirect: true }))
      .then(() => {
        sendAnalyticsGamesImport(this.props.account);
      })
      .catch(throwValidationError);
  };

  render() {
    const {
      className,
      account,
      accountId,
      intl,
      status,
      name,
      slug,
      icon,
      error,
      submitting,
      handleSubmit,
    } = this.props;

    const getLoginDescriptionMessageId = cond([
      [equals('gog'), always('game_accounts.import_login_desc_gog')],
      [T, always('game_accounts.import_login_desc_other')],
    ]);

    const accountTitle = intl.formatMessage({
      id: `game_accounts.${account}_placeholder`,
    });

    return (
      <form className={cn('import-form', className)} onSubmit={handleSubmit(this.submit)}>
        <div className="import-form__label-wrap">
          <div className="import-form__label">
            <SimpleIntlMessage id={getLoginDescriptionMessageId(account)} values={{ name: accountTitle }} />
          </div>
          <SVGInline svg={icon} className="import-form__icon" />
        </div>
        {error && error.map((e) => <Error error={e} kind="form" key={e} />)}
        <Field type="text" name={accountId} placeholder={accountTitle} component={Input} />
        <Button
          className="import-form__submit-button"
          type="submit"
          kind="fill"
          size="medium"
          loading={submitting}
          disabled={submitting}
        >
          <SimpleIntlMessage id="game_accounts.connect_button" />
        </Button>
        {includes(['error', 'unavailable', 'private-games', 'private-user'], status) && (
          <StatusBlock status={status} name={name} slug={slug} className="import-form__status-block" />
        )}
      </form>
    );
  }
}

ImportForm.defaultProps = defaultProps;

export default ImportForm;
