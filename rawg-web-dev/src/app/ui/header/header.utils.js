import { dispatchCustomEvent } from 'tools/dispatch-custom-event';
import { TOGGLE_PROFILE_IFRAME_VISIBILITY } from 'app/pages/app/app.actions';
import config from 'config/config';

export function createAvatar(letter = '') {
  const height = 96;
  const width = 96;

  const canvas = document.createElement('canvas');

  canvas.height = height;
  canvas.width = width;

  const context = canvas.getContext('2d');

  if (!context) {
    return '';
  }

  const color = '#cdf500';
  const fontPos = width / 2;

  context.fillStyle = color;
  context.fillRect(0, 0, width, height);

  context.font = `bold ${width / 2.5}px Arial`;

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#0f0f0f';
  context.fillText(letter.toUpperCase(), fontPos, fontPos + 3, fontPos);

  return canvas.toDataURL();
}

export function showIframeModal({ auth = false, from = '', game = '' }) {
  const url = new URL(auth ? config.authLink : config.registerLink);

  if (from) {
    url.searchParams.set('from', from);
  }

  if (game) {
    url.searchParams.set('game', game);
  }

  dispatchCustomEvent({
    el: document,
    eventName: TOGGLE_PROFILE_IFRAME_VISIBILITY,
    detail: {
      state: url.toString(),
    },
  });
}
