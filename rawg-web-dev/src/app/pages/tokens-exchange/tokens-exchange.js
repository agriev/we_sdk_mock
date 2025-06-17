import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { compose, withHandlers, withState } from 'recompose';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';
import { injectIntl, FormattedMessage, FormattedHTMLMessage } from 'react-intl';
import { Field, reduxForm, formValueSelector } from 'redux-form';

import copyTextToClipboard from 'tools/copy-to-clipboard';
import prepare from 'tools/hocs/prepare';
import checkFeature from 'tools/hocs/check-feature';
import throwValidationError from 'tools/throw-validation-error';

import { addNotification, NOTIF_STATUS_SUCCESS } from 'app/pages/app/components/notifications/notifications.actions';

import { LOCAL_TOKENS_SENT } from 'app/pages/app/components/notifications/notifications.constants';

import showTokens from 'app/pages/tokens/funcs/show-tokens';

import Heading from 'app/ui/heading';
import Content from 'app/ui/content';
import Page from 'app/ui/page';
import currentUserType from 'app/components/current-user/current-user.types';
import intlShape from 'tools/prop-types/intl-shape';
import Button from 'app/ui/button/button';
import { sendTokens } from './tokens-exchange.actions';

import './tokens-exchange.styl';

const formCode = 'tokens-exchange';
const fieldSelector = formValueSelector(formCode);

const submit = (values, dispatch) => dispatch(sendTokens(values)).catch(throwValidationError);

const hoc = compose(
  hot(module),
  checkFeature('tokensExchange'),
  prepare(),
  connect((state) => ({
    size: state.app.size,
    currentUser: state.currentUser,
    wallet: state.currentUser.wallet || '0x6d24dd7dcfe26ef80aa9b038ae99b8274966a78d',
    target: fieldSelector(state, 'target'),
  })),
  reduxForm({
    form: 'tokens-exchange',
    onSubmitSuccess: (result, dispatch, { target }) => {
      dispatch(
        addNotification({
          id: LOCAL_TOKENS_SENT,
          weight: 8,
          authenticated: true,
          expires: 1,
          local: true,
          status: NOTIF_STATUS_SUCCESS,
          message: <FormattedHTMLMessage id="tokens.exchangePage_tokens_sent" values={{ target }} />,
        }),
      );
    },
  }),
  injectIntl,
  withState('copied', 'setCopied', false),
  withHandlers({
    copyWalletId: ({ setCopied, wallet }) => () => {
      copyTextToClipboard(wallet);

      setCopied(true);
      setTimeout(() => setCopied(false), 150);
    },
    setMaxAmount: ({ dispatch, change, currentUser }) => () => {
      dispatch(change('amount', showTokens(currentUser)));
    },
  }),
);

const componentPropertyTypes = {
  currentUser: currentUserType.isRequired,
  intl: intlShape.isRequired,
  copied: PropTypes.bool.isRequired,
  copyWalletId: PropTypes.func.isRequired,
  wallet: PropTypes.string.isRequired,
  setMaxAmount: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
};

const defaultProps = {};

const TokensExchangeComponent = ({
  intl,
  wallet,
  setMaxAmount,
  copied,
  copyWalletId,
  currentUser,
  handleSubmit,
  submitting,
}) => (
  <Page
    helmet={{
      title: intl.formatMessage({ id: 'tokens.exchangePage_title' }),
    }}
  >
    <Content columns="1">
      <div className="tokens-exchange">
        <Heading className="tokens-exchange__title" rank={1} looksLike={2}>
          <span className="tokens-exchange__title__text">
            <FormattedMessage id="tokens.exchangePage_h1_title" />
          </span>
          <span className="tokens-exchange__title__coins">
            <span className="tokens-exchange__title__coins-content">{showTokens(currentUser)}</span>
          </span>
        </Heading>
        <div className="tokens-exchange__desc">
          <FormattedMessage id="tokens.exchangePage_desc" />
        </div>
        <div className="tokens-exchange__get-tokens-container">
          <div className="tokens-exchange__get-tokens-content">
            <h2 className="tokens-exchange__get-tokens-content__title">
              <FormattedMessage id="tokens.exchangePage_get_tokens" />
            </h2>
            <div className="tokens-exchange__get-tokens-content__desc">
              <FormattedMessage id="tokens.exchangePage_get_tokens_desc" />
            </div>
            <div className="tokens-exchange__get-tokens-content__address-title">
              <FormattedMessage id="tokens.exchangePage_payment_address" />
            </div>
            <div
              className={cn('tokens-exchange__get-tokens-content__address-container', {
                copied,
              })}
              onClick={copyWalletId}
              role="button"
              tabIndex={0}
            >
              <div className="tokens-exchange__get-tokens-content__address-value">{wallet}</div>
            </div>
            <div className="tokens-exchange__get-tokens-content__min-payment">
              <FormattedMessage id="tokens.exchangePage_min_payment" values={{ btc: '0,001945', starta: '1,618.23' }} />
            </div>
          </div>
          <div className="tokens-exchange__get-tokens-help">
            <div className="tokens-exchange__get-tokens-help__title">
              <FormattedMessage id="tokens.exchangePage_get_help_title" />
            </div>
            <div className="tokens-exchange__get-tokens-help__text">
              <FormattedMessage id="tokens.exchangePage_get_help_text" />
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit(submit)} className="tokens-exchange__send-tokens-container">
          <div className="tokens-exchange__send-tokens-content">
            <h2 className="tokens-exchange__send-tokens__title">
              <FormattedMessage id="tokens.exchangePage_send_tokens" />
            </h2>
            <div className="tokens-exchange__send-tokens__desc">
              <FormattedMessage id="tokens.exchangePage_send_tokens_desc" />
            </div>
            <div className="tokens-exchange__send-tokens__to">
              <div className="tokens-exchange__send-tokens__to__title">
                <FormattedMessage id="tokens.exchangePage_send_to" />
              </div>
              <div className="tokens-exchange__send-tokens__to__input">
                <Field name="target" component="input" type="text" placeholder="000000000000000000000000000000" />
              </div>
            </div>
            <div className="tokens-exchange__send-tokens__amount">
              <div className="tokens-exchange__send-tokens__amount__title">
                <FormattedMessage id="tokens.exchangePage_amount" />
              </div>
              <div className="tokens-exchange__send-tokens__amount__input">
                <Field name="amount" component="input" type="text" placeholder="0" />
                <div className="tokens-exchange__send-tokens__amount_input__info">
                  <div
                    className="tokens-exchange__send-tokens__amount_send-all"
                    role="button"
                    tabIndex={0}
                    onClick={setMaxAmount}
                  >
                    <FormattedMessage id="tokens.exchangePage_send_all" />
                  </div>
                  <div className="tokens-exchange__send-tokens__amount_balance">
                    <FormattedMessage
                      id="tokens.exchangePage_your_balance"
                      values={{ balance: showTokens(currentUser) }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="tokens-exchange__send-tokens__password">
              <div className="tokens-exchange__send-tokens__password-title">
                <FormattedMessage id="tokens.exchangePage_confirm_by_password" />
              </div>
              <div className="tokens-exchange__send-tokens__password-input">
                <Field
                  name="password"
                  component="input"
                  type="password"
                  placeholder={intl.formatMessage({ id: 'tokens.exchangePage_password' })}
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                className="tokens-exchange__send-tokens__send-btn"
                kind="fill"
                size="medium"
                disabled={submitting}
                loading={submitting}
              >
                <FormattedMessage id="tokens.exchangePage_send_tokens" />
              </Button>
            </div>
          </div>
          <div className="tokens-exchange__send-tokens-help">
            <div className="tokens-exchange__send-tokens-help__title">
              <FormattedMessage id="tokens.exchangePage_send_help_title" />
            </div>
            <div className="tokens-exchange__send-tokens-help__text">
              <FormattedMessage id="tokens.exchangePage_send_help_text" />
            </div>
          </div>
        </form>
      </div>
    </Content>
  </Page>
);

TokensExchangeComponent.propTypes = componentPropertyTypes;
TokensExchangeComponent.defaultProps = defaultProps;

const TokensExchange = hoc(TokensExchangeComponent);

export default TokensExchange;
