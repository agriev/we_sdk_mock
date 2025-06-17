import React, { useState } from 'react';
// import { Link } from 'app/components/link';

import cn from 'classnames';
import PropTypes from 'prop-types';

import './game-authorization.styl';
// import Button from 'app/ui/button';

import { reduxForm } from 'redux-form';
import { compose } from 'recompose';

// import { login } from '../../pages/login/login.actions';
import { dispatchCustomEvent } from 'tools/dispatch-custom-event';
import { TOGGLE_PROFILE_IFRAME_VISIBILITY } from 'app/pages/app/app.actions';
import config from '../../../config/config';

const hoc = compose(
  reduxForm({
    form: 'login',
    persistentSubmitErrors: true,
  }),
);

const GameAuthorizationInput = (props) => {
  return (
    <>
      <input
        className={cn({
          isError: props.error,
        })}
        placeholder={props.placeholder}
        name={props.name}
        type={props.type}
        onInput={(e) => props.onInput(e.target.value)}
        value={props.value}
      />

      {props.error && <span className="game-authorization__error">{props.error}</span>}
    </>
  );
};

GameAuthorizationInput.propTypes = {
  error: PropTypes.string,
  name: PropTypes.string,
  placeholder: PropTypes.string,
  type: PropTypes.string,

  value: PropTypes.string,
  onInput: PropTypes.func,
};

const GameAuthorization = (props) => {
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);

  function onInput(key, value) {
    return setForm((v) => {
      return {
        ...v,
        [key]: value,
      };
    });
  }

  // async function onSubmit(event) {
  //   event.preventDefault();
  //   setFormLoading(true);

  //   try {
  //     setFormErrors({});

  //     const { data } = await props.dispatch(login(form));
  //     console.log(data);
  //   } catch ({ errors = {} }) {
  //     console.log(errors);
  //     setFormErrors(errors);
  //   } finally {
  //     setFormLoading(false);
  //   }
  // }

  function onSubmit(event) {
    event.preventDefault();
  }

  function onClick() {
    dispatchCustomEvent({
      el: document,
      eventName: TOGGLE_PROFILE_IFRAME_VISIBILITY,
      detail: {
        state: config.registerLink,
      },
    });
  }

  return (
    <div
      className={cn('game-authorization', props.isSidebar && 'isSidebar', props.isHidden && 'isHidden')}
      onClick={onClick}
      role="button"
      tabIndex={-1}
    >
      <span className="game-authorization__title">Войди, чтобы не потерять свой прогресс в {props.name}.</span>

      <button type="button">Войти</button>

      <form onSubmit={onSubmit}>
        <div className="game-authorization__form">
          <GameAuthorizationInput
            placeholder="Почта"
            type="email"
            name="email"
            error={formErrors.email}
            onInput={(value) => onInput('email', value)}
            value={form.email}
          />

          <GameAuthorizationInput
            placeholder="Пароль"
            type="password"
            name="password"
            error={formErrors.password}
            onInput={(value) => onInput('password', value)}
            value={form.password}
          />

          {/* {formErrors.non_field_errors && (
            <span className="game-authorization__error">{formErrors.non_field_errors}</span>
          )} */}
        </div>

        <div className="game-authorization__links">
          <a href="#signup">Нет аккаунта? Создать</a>
          <a href="#password_recovery">Забыл пароль</a>
        </div>
      </form>
    </div>
  );
};

GameAuthorization.propTypes = {
  dispatch: PropTypes.func,
  isHidden: PropTypes.bool,
  isSidebar: PropTypes.bool,
  name: PropTypes.string.isRequired,
};

export default hoc(GameAuthorization);
