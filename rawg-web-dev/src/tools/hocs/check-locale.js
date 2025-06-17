import React from 'react';
import { ReactReduxContext } from 'react-redux';

import { setStatus } from 'app/pages/app/app.actions';

/**
 * Декоратор проверяет, является ли текущая локаль той, которая указана,
 * и если она другая - то возвращает 404-ю ошибку вместо компонента.
 *
 * @param {string} locale название локали, активность которой следует проверить
 */
const checkLocale = (locale) => (decoratedComponent) =>
  class localeChecker extends React.Component {
    static contextType = ReactReduxContext;

    constructor(props, context) {
      super(props, context);

      const { store } = this.context;

      if (!this.isCurrentLocale()) {
        store.dispatch(setStatus(404));
      }
    }

    isCurrentLocale = () => {
      const { store } = this.context;
      const currentLocale = store.getState().app.locale;

      return locale === currentLocale;
    };

    render() {
      if (!this.isCurrentLocale()) {
        return null;
      }

      return React.createElement(decoratedComponent, this.props);
    }
  };

export default checkLocale;
