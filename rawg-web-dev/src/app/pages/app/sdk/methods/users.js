import { AgRuSdkMethods } from '@agru/sdk';

import config from 'config/config';
import { parseCookies } from 'tools/fetch';

export function useSDKUsers(context) {
  return {
    handleGetUsers,
  };

  async function handleGetUsers(data) {
    const cookies = parseCookies(document.cookie);

    try {
      const response = await fetch(`${config.apiAddress.ru}/api/players?players_ids=${data}`, {
        headers: {
          'X-CSRFToken': cookies.csrftoken,
        },

        parse: false,
        state: context.props.state,
      });

      const json = await response.json();

      if (response.status > 201) {
        throw json;
      }

      context.iframeSource.postMessage(
        {
          data: [json, null],
          type: AgRuSdkMethods.GetUsers,
        },
        '*',
      );
    } catch (error) {
      context.iframeSource.postMessage(
        {
          data: [[], error],
          type: AgRuSdkMethods.GetUsers,
        },
        '*',
      );
    }
  }
}
