import { curry } from 'ramda';

/**
 * На продакшене бекенд позволяет делать запросы только на определённые
 * размеры ресайзов, для защиты от попыток сделать кучу запросов на различные размеры.
 */
const availableSizes = [80, 200, 234, 420, 600, 640, 1280, 1920, 2560, 3840];

const resize = curry((size, img) => {
  if (!availableSizes.includes(size)) {
    throw new Error('Please use only one of available sizes on resize.');
  }

  if (typeof img !== 'string') {
    return '';
  }

  // Изображения с /media/api/ не меняем
  if (img.includes('/media/api/')) {
    return img;
  }

  return (img || '').replace('/media/', `/media/resize/${size}/-/`);
});

export default resize;
