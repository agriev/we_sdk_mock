import cn from 'classnames';
import PropTypes from 'prop-types';

import React, { useState, useEffect, useLayoutEffect, useReducer } from 'react';
import { connect } from 'react-redux';
import SVGInline from 'react-svg-inline';

import fetch from 'tools/fetch';

import iconChevron from 'assets/icons/slider-chevron.svg';
import iconClose from './assets/close.svg';

import iconCard from './assets/payment/card.svg';
import iconMir from './assets/payment/mir.svg';
import iconOther from './assets/payment/other.svg';
import iconSberPay from './assets/payment/sberpay.svg';
import iconSbp from './assets/payment/sbp.svg';
import iconYoomoney from './assets/payment/yoomoney.svg';
// import iconQiwi from './assets/payment/qiwi.svg';

import './payment.styl';

export const PAYMENT_SYSTEM_KEY = 'defaultPaymentSystem';

export const PAYMENT_METHODS = [
  {
    icon: iconCard,
    key: 'bank_card',

    subtitle: 'Visa, Mastercard, Mir',
    title: 'Банковская карта',
  },
  {
    icon: iconSberPay,

    key: 'sberbank',
    title: 'SberPay',
  },
  {
    icon: iconMir,

    key: 'mir_pay',
    title: 'Mir Pay',
  },
  {
    icon: iconSbp,

    key: 'sbp',
    title: 'СБП',
  },
  {
    icon: iconYoomoney,

    key: 'yoo_money',
    title: 'Кошелек ЮMoney',
  },
  // {
  //   icon: iconQiwi,

  //   key: 'qiwi',
  //   title: 'Кошелек QIWI',
  // },
  {
    icon: iconOther,

    key: 'other',
    title: 'Другие способы',
  },
];

const GamePayment = ({ isAlternative = false, onClose = () => {}, onError = () => {}, state, token = '' }) => {
  const [isFetching, setFetching] = useState(false);
  const [activeSystem, setActiveSystem] = useState('ukassa');

  const [systemData, setSystemData] = useReducer((prev, next) => ({ ...prev, ...next }), {
    ukassa: null,
    xsolla: null,
  });

  const systemsEnabled = {
    ukassa: true,
    xsolla: true,
  };

  function onCloseWindow() {
    onClose(true);
  }

  async function onSystemClick(system) {
    localStorage.setItem(PAYMENT_SYSTEM_KEY, system);

    setActiveSystem(system);
    setFetching(true);

    let data = systemData[system];

    if (!data) {
      try {
        data = await fetch('/api/payment/token', {
          data: {
            payment_system: system,
            token,
          },

          method: 'POST',
          state,
        });

        setSystemData({ [system]: data });
      } catch (error) {
        systemsEnabled[system] = false;
        const nextSystem = system === 'ukassa' ? 'xsolla' : 'ukassa';

        if (systemsEnabled[nextSystem]) {
          return onSystemClick(nextSystem);
        }

        if (typeof onError === 'function') {
          try {
            // eslint-disable-next-line guard-for-in
            for (const key in error.errors || {}) {
              onError(error.errors[key]);
              break;
            }
          } catch (e) {
            onError([]);
          }
        }

        return onClose(true);
      }
    }

    document.dispatchEvent(new CustomEvent('gamePayment-open', { detail: { originalToken: token, ...data } }));

    setFetching(false);
  }

  // async function onMethodClick(method) {
  //   setFetching(true);

  //   const system = method === 'other' ? 'xsolla' : 'ukassa';
  //   let data = systemData[system];

  //   if (!data) {
  //     // eslint-disable-next-line no-multi-assign
  //     data = await fetch('/api/payment/token', {
  //       data: {
  //         // method,

  //         payment_system: system,
  //         token,
  //       },

  //       method: 'POST',
  //       state,
  //     });

  //     setSystemData({ [system]: data });
  //   }

  //   document.dispatchEvent(new CustomEvent('gamePayment-open', { detail: { method, originalToken: token, ...data } }));

  //   setFetching(false);
  // }

  useEffect(() => {
    document.addEventListener('gamePayment-closeWindow', onCloseWindow);

    return () => {
      document.removeEventListener('gamePayment-closeWindow', onCloseWindow);
    };
  });

  useEffect(() => {
    if (token) {
      let system = localStorage.getItem(PAYMENT_SYSTEM_KEY);

      if (!(system in systemData)) {
        system = 'ukassa';
      }

      setActiveSystem(system);
      onSystemClick(system);
    }
  }, [token]);

  return (
    <div
      className={cn('game-payment', {
        'game-payment--alternative': isAlternative,
      })}
    >
      <div className="game-payment__system">
        <div className="game-payment__system-wrapper">
          <header className="game-payment__system-header">
            {!isAlternative && (
              <SVGInline className="game-payment__system-close" svg={iconClose} onClick={() => onClose(true)} />
            )}

            <div className="game-payment__system-items">
              {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
              {systemsEnabled.ukassa && (
                <div
                  className={cn('game-payment__system-item', {
                    'game-payment__system-item--active': activeSystem === 'ukassa',
                  })}
                  onClick={() => onSystemClick('ukassa')}
                >
                  Основные
                </div>
              )}

              {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
              {systemsEnabled.xsolla && (
                <div
                  className={cn('game-payment__system-item', {
                    'game-payment__system-item--active': activeSystem === 'xsolla',
                  })}
                  onClick={() => onSystemClick('xsolla')}
                >
                  Зарубежные и другие
                </div>
              )}
            </div>
          </header>

          <div className="game-payment__system-content" />
        </div>
      </div>

      {isFetching && (
        <div className="game-payment-loader">
          <div />
          <div />
          <div />
          <div />
        </div>
      )}

      {/* <div
        className="game-payment-window hide-scroll"
        role="button"
        tabIndex={0}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="game-payment-header">
          <span className="game-payment-header__title">Способ оплаты</span>
          <SVGInline svg={iconClose} onClick={() => onClose(true)} />
        </header>

        {isFetching && (
          <div className="game-payment-loader">
            <div />
            <div />
            <div />
            <div />
          </div>
        )}

        <div className="game-payment-methods" style={{ opacity: isFetching ? 0 : 1 }}>
          {PAYMENT_METHODS.map((method) => (
            <div
              key={method.key}
              className="game-payment-method"
              tabIndex={0}
              role="button"
              onClick={() => onMethodClick(method.key)}
            >
              <SVGInline svg={method.icon} className="game-payment-method__icon" />

              <div className="game-payment-method__body">
                <div className="game-payment-method__info">
                  <span className="game-payment-method__title">{method.title}</span>
                  {method.subtitle && <span className="game-payment-method__subtitle">{method.subtitle}</span>}
                </div>

                <SVGInline svg={iconChevron} width="6" height="10" className="game-payment-method__chevron" />
              </div>
            </div>
          ))}
        </div>

        <footer className="game-payment-footer">
          <SVGInline className="game-payment-footer__close" svg={iconClose} onClick={() => onClose(true)} />
        </footer>
      </div> */}
    </div>
  );
};

GamePayment.propTypes = {
  isAlternative: PropTypes.bool,
  onClose: PropTypes.func,
  onError: PropTypes.func,
  state: PropTypes.object,
  token: PropTypes.string,
};

export default connect((state) => {
  return {
    state,
  };
})(GamePayment);
