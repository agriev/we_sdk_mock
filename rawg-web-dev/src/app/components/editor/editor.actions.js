/* eslint-disable import/prefer-default-export */

import fetch from 'tools/fetch';

export function uploadImage(image) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = '/api/images';

    return fetch(uri, {
      method: 'post',
      data: {
        image,
      },
      multipart: true,
      state,
    });
  };
}
