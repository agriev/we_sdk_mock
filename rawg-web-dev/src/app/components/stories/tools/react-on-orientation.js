/* eslint-disable no-multi-spaces */

import mean from 'lodash/mean';
import throttle from 'lodash/throttle';
import getAppContainerHeight from 'tools/get-app-container-height';
import getAppContainerWidth from 'tools/get-app-container-width';

/**
 * Возвращает функцию, трансформирующую положение видеоролика при повороте
 * девайса в стороны. Обрабатывает две ситуации: когда девайс положили
 * на ровную поверхность и поворачивают его вокруг своей оси, и когда
 * девайс держат в руке и наклоняют его в сторону.
 *
 * @param {Object} event Объект события deviceorientation
 * @param {Object} videoArg Объект видеоролика
 */
const reactOnOrientation = () => {
  const boundaries = 1;
  const averageGamma = [];

  let renderPending = false;
  let latestTilt = 0;

  const head = document.querySelector('head');
  const style = document.createElement('style');
  style.type = 'text/css';

  head.appendChild(style);

  const updatePosition = () => {
    const windowHeight = getAppContainerHeight();
    const windowWidth = getAppContainerWidth();
    const result = ((windowHeight * 1.07 - windowWidth) / 2) * latestTilt;

    style.innerHTML = `
      .stories__videos .video-react-video,
      .stories__videos .video-js {
        transform: translateX(${result}px);
        transition: transform .2s;
      }
    `;

    renderPending = false;
  };

  const listener = throttle((event) => {
    if (averageGamma.length > 10) {
      averageGamma.shift();
    }

    let trans = event.gamma;
    // trans = Math.abs(trans / 20) ** 1.5;
    trans = Math.abs(trans / 25) ** 3;
    if (event.gamma < 0) {
      trans *= -1;
    }
    trans *= -1;

    if (trans < -boundaries) {
      trans = -boundaries;
    }
    if (trans > boundaries) {
      trans = boundaries;
    }

    averageGamma.push(trans);

    latestTilt = mean(averageGamma);

    if (!renderPending) {
      renderPending = true;
      window.requestAnimationFrame(updatePosition);
    }
  }, 10);

  const stop = () => {
    head.removeChild(style);
  };

  return {
    listener,
    stop,
  };
};

export default reactOnOrientation;
