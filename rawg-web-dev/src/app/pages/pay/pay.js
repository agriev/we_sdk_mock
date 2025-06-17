import cn from 'classnames';
import PropTypes from 'prop-types';
import React, { useState, useEffect, useMemo } from 'react';
import { injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import SVGInline from 'react-svg-inline';
import { compose } from 'recompose';
import prepare from 'tools/hocs/prepare';

import Header from 'app/ui/header';
import Footer from 'app/ui/footer/footer';
import GamePayment from 'app/pages/game/game/payment';

import iconCurrency from 'assets/icons/currency.svg';
import iconWarning from 'assets/icons/warning.svg';

import './pay.styl';
import { logout } from 'app/components/current-user/current-user.actions';
import { showIframeModal } from 'app/ui/header/header.utils';

export const ERROR_INVALID_USER = 'invalid_user';
export const ERROR_PAYMENT_FAILED = 'payment_failed';
export const ERROR_UNAUTHORIZED = 'unauthorized';

const Message = ({ buttonText = '', message = '', onClick = () => {}, type }) => {
  const [isDisabled, setDisabled] = useState(false);

  async function handleClick() {
    setDisabled(true);

    try {
      await onClick();
    } catch {
      //
    } finally {
      setDisabled(false);
    }
  }

  return (
    <div className={cn('pay__message', `pay__message--${type}`)}>
      <div className="pay__message-body">
        <SVGInline svg={type === 'warning' ? iconWarning : iconCurrency} />
        <p>{message}</p>
      </div>

      {!!buttonText && (
        <button onClick={handleClick} className="pay__message-button" type="button" disabled={isDisabled}>
          {buttonText}
        </button>
      )}
    </div>
  );
};

Message.propTypes = {
  buttonText: PropTypes.string,
  message: PropTypes.string,
  onClick: PropTypes.func,
  type: PropTypes.string,
};

const PayComponent = ({ currentUser, dispatch }) => {
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');

  const messageInfo = useMemo(() => {
    if (success) {
      return {
        message: 'Платеж прошел успешно. Вернитесь в игру.',
        type: 'success',
      };
    }

    if (!errorMsg) {
      return null;
    }

    if (errorMsg === ERROR_PAYMENT_FAILED) {
      return {
        message: 'Возникли сложности с оплатой. Вернитесь в игру и попробуйте позже.',
        type: 'warning',
      };
    }

    if (errorMsg === ERROR_UNAUTHORIZED) {
      return {
        buttonText: 'Войти в аккаунт',
        message: 'Для оплаты необходимо авторизоваться в аккаунт',
        type: 'warning',

        onClick() {
          showIframeModal({ auth: false });
        },
      };
    }

    if (errorMsg === ERROR_INVALID_USER) {
      return {
        buttonText: 'Сменить аккаунт',
        message:
          'Вы пытаетесь оплатить не с той учётной записи, в которой авторизированы в игре. Войдите на сайт под игровой учетной записью.',
        type: 'warning',

        async onClick() {
          document.cookie = `gsid_rc=; path=/; domain=.dev.ag.ru; expires=${new Date(0).toUTCString()}`;
          document.cookie = `gsid=; path=/; domain=.ag.ru; expires=${new Date(0).toUTCString()}`;

          await dispatch(logout());
          setErrorMsg(ERROR_UNAUTHORIZED);

          showIframeModal({ auth: true });
        },
      };
    }

    return {
      buttonText: 'Перезагрузить',
      message: 'Невозможно оплатить, внутренняя ошибка.',
      type: 'warning',

      onClick() {
        window.location.reload();
      },
    };
  }, [errorMsg, success]);

  useEffect(() => {
    const url = new URL(window.location.href);
    setToken(url.searchParams.get('token') || ' ');
  }, []);

  useEffect(() => {
    if (currentUser.id) {
      if (errorMsg === ERROR_UNAUTHORIZED) {
        setErrorMsg('');
      }

      return;
    }

    setErrorMsg(ERROR_UNAUTHORIZED);
  }, [currentUser]);

  function onPaymentComplete(event) {
    if (event.detail.status === 'success') {
      return setSuccess(true);
    }

    return setErrorMsg(ERROR_PAYMENT_FAILED);
  }

  useEffect(() => {
    document.addEventListener('payment-complete', onPaymentComplete);

    return () => {
      document.removeEventListener('payment-complete', onPaymentComplete);
    };
  }, []);

  function onError(error = []) {
    setErrorMsg(Array.isArray(error) ? error[0] : 'error');
  }

  return (
    <div className="pay">
      <Header isAlternative pathname="/pay" />

      <div className="pay__body">
        <div className="pay__body-inner">
          {messageInfo ? (
            <Message {...messageInfo} />
          ) : (
            !!currentUser.id && !!token && <GamePayment onError={onError} isAlternative token={token} />
          )}
        </div>
      </div>

      <div className="pay__footer">
        <Footer />
      </div>
    </div>
  );
};

PayComponent.propTypes = {
  currentUser: PropTypes.object,
  dispatch: PropTypes.func,
};

const hoc = compose(
  prepare(),
  connect((state) => ({
    currentUser: state.currentUser,
  })),
  injectIntl,
);

const Pay = hoc(PayComponent);
export default Pay;
