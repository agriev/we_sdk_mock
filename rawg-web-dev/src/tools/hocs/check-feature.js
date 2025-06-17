import React from 'react';
import { ReactReduxContext } from 'react-redux';

import { setStatus } from 'app/pages/app/app.actions';
import config from 'config/config';

/**
 * Декоратор проверяет, активна ли определённая фича в текущем окружении проекта,
 * и если она неактивна - то возвращает 404-ю ошибку вместо компонента.
 *
 * @param {string} feature название фичи, активность которой следует проверить
 */
export default function checkFeature(feature) {
  if (config.features[feature] !== true) {
    return () =>
      class Show404 extends React.Component {
        static contextType = ReactReduxContext;

        constructor(props, context) {
          super(props, context);

          const { store } = this.context;

          store.dispatch(setStatus(404));
        }

        render = () => null;
      };
  }

  return (DecoratedComponent) => DecoratedComponent;
}
