import fetch from 'tools/fetch';

export const POST_REMOVED = 'POST_REMOVED';

export function removePost(post) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/discussions/${post.id}`;

    return fetch(uri, {
      method: 'delete',
      parse: false,
      state,
    }).then(() => {
      dispatch({
        type: POST_REMOVED,
        data: {
          post,
        },
      });
    });
  };
}
