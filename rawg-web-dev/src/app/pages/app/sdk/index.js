import { AgRuSdkEvents, AgRuSdkMethods } from '@agru/sdk';
import { handleOptionsUpdates } from './events';

import { useSDKAuthorization, useSDKPayment, useSDKSaveData, useSDKUsers } from './methods';

export function useSDK(context) {
  const authorization = useSDKAuthorization(context);
  const payment = useSDKPayment(context);
  const saveData = useSDKSaveData(context);
  const users = useSDKUsers(context);

  payment.listen();

  return {
    emit,
    listen,
  };

  function emit(eventKey) {
    const handlers = {
      [AgRuSdkEvents.OptionsUpdates]: () => handleOptionsUpdates(context),
    };

    if (handlers[eventKey]) {
      handlers[eventKey]();
    }
  }

  function listen(event) {
    let payload = event.data;

    try {
      payload = JSON.parse(payload);

      if (payload.command) {
        payment.handlePaymentCommand(payload);
        return;
      }
    } catch {
      //
    }

    if (typeof payload !== 'object' || Array.isArray(payload)) {
      return;
    }

    const { data, type } = payload;

    if (!('data' in payload) || Array.isArray(data)) {
      return;
    }

    if (!event.data || !String(event.data.type).includes('agru-')) {
      return;
    }

    if (!context.iframeSource) {
      context.iframeSource = event.source;
    }

    const handlers = {
      [AgRuSdkMethods.Authorize]: () => authorization.handleAuthorize(),
      [AgRuSdkMethods.AuthorizeAndWait]: () => authorization.handleAuthorize(),

      [AgRuSdkMethods.GetUsers]: () => users.handleGetUsers(data),

      [AgRuSdkMethods.GetSaveData]: () => saveData.handleGetSaveData(data),
      [AgRuSdkMethods.SetSaveData]: () => saveData.handleSetSaveData(data),

      [AgRuSdkMethods.Logout]: () => authorization.handleLogout(),

      [AgRuSdkMethods.SayHello]() {
        context.iframeSource.postMessage(
          {
            data: ['Hello, from AG.ru', null],
            type: AgRuSdkMethods.SayHello,
          },
          '*',
        );
      },
    };

    if (handlers[type]) {
      handlers[type]();
    }
  }
}
