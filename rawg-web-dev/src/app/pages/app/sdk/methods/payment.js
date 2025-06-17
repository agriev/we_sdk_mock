import { AgRuSdkMethods } from '@agru/sdk';
import config from 'config/config';

import fetch from 'tools/fetch';
import { toggleProfileIframeVisibility } from '../../app.actions';

export function useSDKPayment(context) {
  let observer;

  let observableParent;
  let observableTarget;

  const isPayPage = typeof window !== 'undefined' && window.location.pathname === '/pay';

  const state = {
    info: null,
    status: false,
  };

  const systemState = {
    ukassa: false,
    xsolla: false,
  };

  const paymentProcessors = {
    // eslint-disable-next-line no-shadow
    async ukassa({ method, originalToken, token }) {
      if (typeof window.YooMoneyCheckoutWidget !== 'function') {
        return;
      }

      if (!systemState.xsolla) {
        state.info = null;
        state.status = false;
      }

      if (!systemState.ukassa) {
        const checkout = new window.YooMoneyCheckoutWidget({
          confirmation_token: token,

          customization: {
            modal: true,
          },

          error_callback: window.alert,
        });

        checkout.on('complete', async ({ status }) => {
          if (observableTarget && observableTarget.firstElementChild) {
            observableTarget.firstElementChild.style.display = 'none';
          }

          document.dispatchEvent(
            new CustomEvent('payment-complete', {
              detail: {
                status,
              },
            }),
          );

          state.info = {
            status,
          };

          if (status === 'success') {
            state.info = await fetch(`/api/payment/by_token/${originalToken}`, {
              method: 'GET',
              state: context.props.state,
            });

            state.info.status = 'success';

            if (state.info.transaction_id) {
              state.info.invoice = state.info.transaction_id;
              delete state.info.transaction_id;
            }

            if (window.gtag) {
              window.gtag('event', 'payment_success', {
                page_title: document.title,
              });
            }
          }

          if (observableTarget) {
            observableTarget.remove();
          }
        });

        checkout.render();
      }

      observableTarget = document.querySelector('.checkout-modal');

      if (observableTarget) {
        if (!systemState.ukassa) {
          observableParent.appendChild(observableTarget);
        }

        observableTarget.style.display = 'block';
        state.status = true;

        if (context.iframeSource) {
          context.iframeSource.postMessage(
            {
              data: [state, null],
              type: AgRuSdkMethods.ShowPayment,
            },
            '*',
          );
        }

        if (typeof window.yaCounter === 'object') {
          window.yaCounter.reachGoal('PaymentOpen');
        }

        if (window.gtag) {
          window.gtag('event', 'payment_open', {
            page_title: document.title,
          });
        }
      }

      observer.observe(observableParent, {
        childList: true,
      });

      systemState.ukassa = true;
    },

    // eslint-disable-next-line no-shadow
    xsolla({ token }) {
      if (typeof window.XPayStationWidget !== 'object') {
        return;
      }

      if (!systemState.ukassa) {
        state.info = null;
        state.status = false;
      }

      if (!systemState.xsolla) {
        window.XPayStationWidget.init({
          access_token: token,
          iframeOnly: true,

          lightbox: {
            width: '460px',
            height: '100%',

            spinner: 'round',
            spinnerColor: '#cccccc',
          },

          sandbox: window.location.host.includes('dev.ag.ru'),
        });

        window.XPayStationWidget.open();
      }

      observableTarget = document.querySelector('.xpaystation-widget-lightbox');

      if (observableTarget) {
        if (!systemState.xsolla) {
          observableParent.appendChild(observableTarget);
        }

        observableTarget.style.display = 'block';
        state.status = true;
      }

      observer.observe(observableParent, {
        childList: true,
      });

      systemState.xsolla = true;
    },
  };

  return {
    handlePaymentCommand,
    listen,
  };

  function handlePaymentCommand({ command = '', data = {} }) {
    const handlers = {
      'open-paystation': function() {
        systemState.xsolla = true;

        // if (!systemState.ukassa) {
        //   state.info = null;
        //   state.status = false;
        // }

        if (context.iframeSource) {
          context.iframeSource.postMessage(
            {
              data: [state, null],
              type: AgRuSdkMethods.ShowPayment,
            },
            '*',
          );
        }

        if (typeof window.yaCounter === 'object') {
          window.yaCounter.reachGoal('PaymentOpen');
        }

        if (window.gtag) {
          window.gtag('event', 'payment_open', {
            page_title: document.title,
          });
        }
      },

      return() {
        const widget = document.querySelector('.xpaystation-widget-lightbox');

        if (widget) {
          widget.remove();
        }
      },

      status() {
        if (!data.paymentInfo) {
          return;
        }

        state.info = data.paymentInfo || null;

        const { status } = data.paymentInfo;

        if (status === 'done' || status === 'troubled') {
          this.return();

          document.dispatchEvent(
            new CustomEvent('payment-complete', {
              detail: {
                status: status === 'done' ? 'success' : status,
              },
            }),
          );

          if (window.gtag) {
            window.gtag('event', 'payment_success', {
              page_title: document.title,
            });
          }
        }
      },
    };

    if (handlers[command]) {
      handlers[command]();
    }
  }

  function listen() {
    document.addEventListener('gamePayment-open', ({ detail }) => {
      if (!context.props.currentUser.id) {
        return context.props.dispatch(
          toggleProfileIframeVisibility({
            callback: () => document.dispatchEvent('gamePayment-open', { detail }),
            state: config.registerLink,
          }),
        );
      }

      observableParent = document.querySelector('.game-payment__system-content');

      observer = new MutationObserver(([element]) => {
        if (element.target.contains(observableTarget)) {
          return;
        }

        state.status = false;

        // context.iframeSource.postMessage(
        //   {
        //     data: [state, null],
        //     type: AgRuSdkMethods.ShowPayment,
        //   },
        //   '*',
        // );

        document.dispatchEvent(new CustomEvent('gamePayment-closeWindow'));
        observer.disconnect();
      });

      if (paymentProcessors[detail.system]) {
        if (observableTarget) {
          observableTarget.style.display = 'none';
        }

        setTimeout(() => {
          paymentProcessors[detail.system](detail);
        });
      }
    });

    document.addEventListener('gamePayment-close', () => {
      state.status = false;

      if (context.iframeSource) {
        context.iframeSource.postMessage(
          {
            data: [state, null],
            type: AgRuSdkMethods.ShowPayment,
          },
          '*',
        );
      }

      // eslint-disable-next-line no-multi-assign
      systemState.xsolla = systemState.ukassa = false;
    });
  }
}
