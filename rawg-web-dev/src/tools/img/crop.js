import { curry } from 'ramda';
import isArray from 'lodash/isArray';
import env from 'config/env';

/**
 * На продакшене бекенд позволяет делать запросы только на определённые
 * размеры ресайзов, для защиты от попыток сделать кучу запросов на различные размеры.
 */
const availableSizes = [[48, 48], [72, 72], [96, 96], [144, 144], [150, 150], [192, 192], [(600, 700)], [600, 400]];

const errorMessage = 'Please use only one of available sizes on crop.';

const crop = curry((sizeArgument, img) => {
  if (typeof img !== 'string') {
    return '';
  }

  // Изображения с /media/api/ не меняем
  if (img.includes('/media/api/')) {
    return img;
  }

  const size = isArray(sizeArgument) ? sizeArgument : [sizeArgument, sizeArgument];

  if (env.isDev()) {
    const sizeAllowed = availableSizes.some(([width, height]) => size[0] === width && size[1] === height);

    if (!sizeAllowed) {
      throw new Error(errorMessage);
    }
  }

  return (img || '').replace('/media/', `/media/crop/${size[0]}/${size[1]}/`);
});

export default crop;
