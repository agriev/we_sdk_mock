import { AgRuSdkMethods } from '@agru/sdk';

import config from 'config/config';
import { parseCookies } from 'tools/fetch';

export function useSDKSaveData(context) {
  return {
    handleGetSaveData,
    handleSetSaveData,
  };

  async function handleGetSaveData(data) {
    const cookies = parseCookies(document.cookie);

    try {
      const response = await fetch(
        `${config.apiAddress.ru}/api/sessiondata/${data.game_sid}?app_id=${data.app_id}&auth_key=${data.auth_key}`,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-CSRFToken': cookies.csrftoken,
          },

          parse: false,
          state: context.props.state,
        },
      );

      const json = await response.json();

      if (response.status > 201) {
        throw json;
      }

      context.iframeSource.postMessage(
        {
          data: [json, null],
          type: AgRuSdkMethods.GetSaveData,
        },
        '*',
      );
    } catch (error) {
      context.iframeSource.postMessage(
        {
          data: [false, error],
          type: AgRuSdkMethods.GetSaveData,
        },
        '*',
      );
    }
  }

  async function handleSetSaveData(data) {
    const cookies = parseCookies(document.cookie);
    let fileContent = '';

    try {
      fileContent = JSON.stringify(data.data);
    } catch (error) {
      context.iframeSource.postMessage({
        data: [false, 'Not a valid JSON'],
        type: AgRuSdkMethods.SetSaveData,
      });
    }

    if (!fileContent) {
      return;
    }

    const { options } = data;

    try {
      const response = await fetch(
        `${config.apiAddress.ru}/api/sessiondata/${options.game_sid}?app_id=${options.app_id}&auth_key=${options.auth_key}`,
        {
          body: new Blob([fileContent], { type: 'application/json' }),

          headers: {
            'Content-Type': 'application/octet-stream',
            'X-CSRFToken': cookies.csrftoken,
          },

          method: 'PUT',

          parse: false,
          state: context.props.state,
        },
      );

      if (response.status > 201) {
        throw await response.text();
      }

      context.iframeSource.postMessage(
        {
          data: [true, null],
          type: AgRuSdkMethods.SetSaveData,
        },
        '*',
      );
    } catch (error) {
      context.iframeSource.postMessage(
        {
          data: [false, error],
          type: AgRuSdkMethods.SetSaveData,
        },
        '*',
      );
    }
  }
}
