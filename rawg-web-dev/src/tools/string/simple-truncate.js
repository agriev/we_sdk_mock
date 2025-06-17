/**
 * Очень простая ф-я для обрезки строки, иногда она более предпочтительна.
 * Если вам нужна более комплексная логика, обратитесь к следующим npm зависимостям:
 *
 * lodash/truncate: https://lodash.com/docs/4.17.11#truncate
 * react-text-truncate: https://github.com/ShinyChang/react-text-truncate
 * react-truncate-html: https://github.com/jariz/react-truncate-html
 * src/app/ui/truncate-block-by-height/truncate-block-by-height.js
 * src/app/ui/truncate-block-by-lines/truncate-block-by-lines.js
 */

import isString from 'lodash/isString';

const simpleTruncate = (length, string) => {
  if (isString(string) && string.length > length) {
    return `${string.substring(0, length)}…`;
  }

  return string;
};

export default simpleTruncate;
