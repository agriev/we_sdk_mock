/* eslint-disable import/prefer-default-export */

import has from 'lodash/has';

import fetch from 'tools/fetch';
import denormalizeGame from 'tools/redux/denormalize-game';

import {
  addNotification,
  EXPIRES_IMMEDIATELY,
  NOTIF_STATUS_SUCCESS,
  NOTIF_STATUS_ERROR,
} from 'app/pages/app/components/notifications/notifications.actions';

import {
  LOCAL_GAME_EDIT_UPLOAD_SCREENSHOT_SUCCESS,
  LOCAL_GAME_EDIT_UPLOAD_SCREENSHOT_ERROR,
} from 'app/pages/app/components/notifications/notifications.constants';

import trans from 'tools/trans';
import { sendAnalyticsEdit } from 'scripts/analytics-helper';

export const GAME_EDIT_UPLOAD_SCREENSHOT_START = 'GAME_EDIT_UPLOAD_SCREENSHOT_START';
export const GAME_EDIT_UPLOAD_SCREENSHOT_SUCCESS = 'GAME_EDIT_UPLOAD_SCREENSHOT_SUCCESS';
export const GAME_EDIT_UPLOAD_SCREENSHOT_FAIL = 'GAME_EDIT_UPLOAD_SCREENSHOT_FAIL';
export const GAME_EDIT_UPLOAD_SCREENSHOTS_START = 'GAME_EDIT_UPLOAD_SCREENSHOTS_START';
export const GAME_EDIT_UPLOAD_SCREENSHOTS_FINISH = 'GAME_EDIT_UPLOAD_SCREENSHOTS_FINISH';
export const GAME_EDIT_REMOVE_SCREENSHOT_START = 'GAME_EDIT_REMOVE_SCREENSHOT_START';
export const GAME_EDIT_REMOVE_SCREENSHOT_SUCCESS = 'GAME_EDIT_REMOVE_SCREENSHOT_SUCCESS';
export const GAME_EDIT_REMOVE_SCREENSHOT_FAIL = 'GAME_EDIT_REMOVE_SCREENSHOT_FAIL';
export const GAME_EDIT_REPLACE_SCREENSHOT_START = 'GAME_EDIT_REPLACE_SCREENSHOT_START';
export const GAME_EDIT_REPLACE_SCREENSHOT_SUCCESS = 'GAME_EDIT_REPLACE_SCREENSHOT_SUCCESS';
export const GAME_EDIT_REPLACE_SCREENSHOT_FAIL = 'GAME_EDIT_REPLACE_SCREENSHOT_FAIL';

export function uploadNewScreenshot(image) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${denormalizeGame(state).slug}/screenshots`;
    const method = 'post';
    const data = {
      image,
    };

    dispatch({
      type: GAME_EDIT_UPLOAD_SCREENSHOT_START,
    });

    return fetch(uri, {
      multipart: true,
      method,
      data,
      state,
    })
      .then((uploadedImage) => {
        dispatch({
          type: GAME_EDIT_UPLOAD_SCREENSHOT_SUCCESS,
          data: {
            image: {
              ...uploadedImage,
              is_deleted: false,
              is_new: true,
            },
          },
        });
      })
      .catch((error) => {
        dispatch({
          type: GAME_EDIT_UPLOAD_SCREENSHOT_FAIL,
          data: error,
        });

        dispatch(
          addNotification({
            id: LOCAL_GAME_EDIT_UPLOAD_SCREENSHOT_ERROR,
            weight: 8,
            local: true,
            fixed: true,
            authenticated: true,
            expires: EXPIRES_IMMEDIATELY,
            status: NOTIF_STATUS_ERROR,
            message: trans('game_edit.field_screenshots_upload_error', {
              text: `Image ${image.name} is too big to upload. Please choose image with less size.`,
            }),
          }),
        );

        throw error;
      });
  };
}

export function replaceScreenshot(id, image) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${denormalizeGame(state).slug}/screenshots/${id}`;
    const method = 'patch';
    const data = {
      image,
    };

    dispatch({
      type: GAME_EDIT_REPLACE_SCREENSHOT_START,
    });

    dispatch({
      type: GAME_EDIT_UPLOAD_SCREENSHOTS_START,
      data: {
        count: 1,
      },
    });

    return fetch(uri, {
      multipart: true,
      method,
      data,
      state,
    })
      .then((uploadedImage) => {
        dispatch({
          type: GAME_EDIT_REPLACE_SCREENSHOT_SUCCESS,
          data: {
            image: uploadedImage,
          },
        });
        dispatch({ type: GAME_EDIT_UPLOAD_SCREENSHOTS_FINISH });
        sendAnalyticsEdit('save');
      })
      .catch((error) => {
        dispatch({
          type: GAME_EDIT_REPLACE_SCREENSHOT_FAIL,
          data: error,
        });

        dispatch(
          addNotification({
            id: LOCAL_GAME_EDIT_UPLOAD_SCREENSHOT_ERROR,
            weight: 8,
            local: true,
            fixed: true,
            authenticated: true,
            expires: EXPIRES_IMMEDIATELY,
            status: NOTIF_STATUS_ERROR,
            message: trans('game_edit.field_screenshots_upload_error', {
              text: `Image ${image.name} is too big to upload. Please choose image with less size.`,
            }),
          }),
        );

        dispatch({
          type: GAME_EDIT_UPLOAD_SCREENSHOTS_FINISH,
        });
      });
  };
}

export function uploadNewScreenshots(images) {
  return async (dispatch, getState) => {
    dispatch({
      type: GAME_EDIT_UPLOAD_SCREENSHOTS_START,
      data: {
        count: images.length,
      },
    });

    let uploadedWithErrors = 0;

    for (const img in images) {
      if (has(images, img)) {
        /* eslint-disable no-await-in-loop */
        try {
          await uploadNewScreenshot(images[img])(dispatch, getState);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log(e);

          uploadedWithErrors += 1;
        }
      }
    }

    if (images.length > uploadedWithErrors) {
      const message =
        uploadedWithErrors > 0
          ? trans('game_edit.field_screenshots_upload_success_with_errors', {
              count: images.length - uploadedWithErrors,
              errors: uploadedWithErrors,
            })
          : trans('game_edit.field_screenshots_upload_success', {
              count: images.length,
            });

      dispatch(
        addNotification({
          id: LOCAL_GAME_EDIT_UPLOAD_SCREENSHOT_SUCCESS,
          weight: 7,
          local: true,
          fixed: true,
          authenticated: true,
          expires: EXPIRES_IMMEDIATELY,
          status: NOTIF_STATUS_SUCCESS,
          rememberHide: false,
          message,
        }),
      );
    }

    dispatch({
      type: GAME_EDIT_UPLOAD_SCREENSHOTS_FINISH,
    });
    sendAnalyticsEdit('save');
  };
}

export function removeScreenshot(id) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${denormalizeGame(state).slug}/screenshots/${id}`;
    const method = 'delete';

    dispatch({
      type: GAME_EDIT_REMOVE_SCREENSHOT_START,
    });

    return fetch(uri, {
      method,
      state,
      parse: false,
    })
      .then(() => {
        dispatch({
          type: GAME_EDIT_REMOVE_SCREENSHOT_SUCCESS,
          data: {
            id,
          },
        });
      })
      .catch((error) => {
        dispatch({
          type: GAME_EDIT_REMOVE_SCREENSHOT_FAIL,
          data: error,
        });

        throw error;
      });
  };
}

export function restoreScreenshot(id) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${denormalizeGame(state).slug}/screenshots/${id}`;
    const method = 'patch';

    dispatch({
      type: GAME_EDIT_REPLACE_SCREENSHOT_START,
    });

    return fetch(uri, {
      method,
      state,
      data: {
        hidden: false,
      },
    })
      .then((image) => {
        dispatch({
          type: GAME_EDIT_REPLACE_SCREENSHOT_SUCCESS,
          data: { image },
        });
      })
      .catch((error) => {
        dispatch({
          type: GAME_EDIT_REPLACE_SCREENSHOT_FAIL,
          data: error,
        });

        throw error;
      });
  };
}
