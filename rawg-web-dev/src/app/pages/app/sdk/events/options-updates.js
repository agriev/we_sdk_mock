import fetch from 'tools/fetch';

export function handleOptionsUpdates(context) {
  if (!context.iframeSource) {
    return;
  }

  const { game } = context.props;

  if (!game.iframe_url) {
    return;
  }

  fetch(`/api/games/${game.slug}`, {
    state: context.props.state,
  })
    .then((response) => {
      const url = new URL(response.iframe_url);
      const newParams = Object.fromEntries(url.searchParams);

      context.iframeSource.postMessage(
        {
          data: [newParams, null],
          type: 'agru-optionsUpdates',
        },
        '*',
      );
    })
    .catch(console.error);
}
