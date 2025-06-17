import React from 'react';
import { FormattedMessage } from 'react-intl';

import get from 'lodash/get';
import keys from 'lodash/keys';
import head from 'lodash/head';
import isObjectLike from 'lodash/isObjectLike';

import trans from 'tools/trans';

import {
  LOCAL_GAME__EDIT_UPDATE_SUCCESS,
  LOCAL_GAME__EDIT_UPDATE_FAIL,
} from 'app/pages/app/components/notifications/notifications.constants';

import {
  EXPIRES_IMMEDIATELY,
  NOTIF_STATUS_SUCCESS,
  NOTIF_STATUS_ERROR,
} from 'app/pages/app/components/notifications/notifications.actions';
import { fieldTitles } from 'app/pages/game-edit/game-edit.helper';

export const GAME_EDIT_UPDATE_FIELD = 'GAME_EDIT_UPDATE_FIELD';
export const GAME_EDIT_MARK_VALUE_DELETED = 'GAME_EDIT_MARK_VALUE_DELETED';
export const GAME_EDIT_UNMARK_VALUE_DELETED = 'GAME_EDIT_UNMARK_VALUE_DELETED';
export const GAME_EDIT_FILL_DATA = 'GAME_EDIT_FILL_DATA';

export const GAME_EDIT_RESET_ALL = 'GAME_EDIT_RESET_ALL';
export const GAME_EDIT_RESET_FIELD = 'GAME_EDIT_RESET_FIELD';
export const GAME_EDIT_RESET_FIELDS = 'GAME_EDIT_RESET_FIELDS';

export function updateField(name, value) {
  return {
    type: GAME_EDIT_UPDATE_FIELD,
    data: {
      name,
      value,
    },
  };
}

export function resetField(name) {
  return {
    type: GAME_EDIT_RESET_FIELD,
    data: {
      name,
    },
  };
}

export function resetFields() {
  return {
    type: GAME_EDIT_RESET_FIELDS,
  };
}

export function resetAll() {
  return {
    type: GAME_EDIT_RESET_ALL,
  };
}

export function markValueDeleted(name, value) {
  return {
    type: GAME_EDIT_MARK_VALUE_DELETED,
    data: {
      name,
      value,
    },
  };
}

export function unmarkValueDeleted(name, value) {
  return {
    type: GAME_EDIT_UNMARK_VALUE_DELETED,
    data: {
      name,
      value,
    },
  };
}

export const getPropertiesOfSuccessNotification = () => ({
  id: LOCAL_GAME__EDIT_UPDATE_SUCCESS,
  weight: 8,
  local: true,
  fixed: true,
  authenticated: true,
  expires: EXPIRES_IMMEDIATELY,
  status: NOTIF_STATUS_SUCCESS,
  message: trans('game_edit.update_info_success'),
});

const getFirstError = (errors) => {
  if (!isObjectLike(errors)) {
    return null;
  }

  const field = head(keys(errors));

  if (field) {
    const message = get(errors, `${field}[0]`);

    if (message) {
      return {
        field: <FormattedMessage id={fieldTitles[field]} />,
        message,
      };
    }
  }

  return null;
};

export const getPropertiesOfErrorNotification = (errorObject) => {
  const { field, message } = getFirstError(get(errorObject, 'errors')) || {};

  return {
    id: LOCAL_GAME__EDIT_UPDATE_FAIL,
    weight: 8,
    local: true,
    fixed: true,
    authenticated: true,
    expires: EXPIRES_IMMEDIATELY,
    status: NOTIF_STATUS_ERROR,
    closeAfter: 6000,
    message: message
      ? trans('game_edit.update_info_failed_with_error', { field, message })
      : trans('game_edit.update_info_failed'),
  };
};

export function fillEditGameData(game) {
  return {
    type: GAME_EDIT_FILL_DATA,
    data: {
      game,
    },
  };
}
