/* eslint-disable camelcase */

import React, { useCallback, useState } from 'react';
// import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';
import { FormattedMessage, useIntl } from 'react-intl';
import { compose } from 'recompose';
import { useDispatch } from 'react-redux';
import { Link } from 'app/components/link';

import './settings-delete-profile.styl';

import checkAuth from 'tools/hocs/check-auth';
import Button from 'app/ui/button';
import Input from 'app/ui/input';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import CloseButton from 'app/ui/close-button';

import prepare from 'tools/hocs/prepare';
import Heading from 'app/ui/heading/heading';
import paths from 'config/paths';
import { deleteProfile } from './settings-delete-profile.actions';

const hoc = compose(
  hot,
  prepare(),
  checkAuth({ login: true }),
);

const SettingsDeleteProfileComponent = () => {
  const dispatch = useDispatch();
  const intl = useIntl();

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const onChangePasswordInput = useCallback((e) => {
    setPasswordError(false);
    setPassword(e.target.value);
  }, []);

  const onDeleteProfileClick = useCallback(async () => {
    setSubmitting(true);
    const result = await dispatch(deleteProfile(password));
    setSubmitting(false);

    if (result === false) {
      setPasswordError(true);
    }
  }, [password]);

  return (
    <Page
      className="page_secondary"
      helmet={{
        title: intl.formatMessage({ id: 'settings.head_title/delete' }),
        noindex: true,
      }}
      header={{ display: false }}
    >
      <Content columns="1">
        <CloseButton className="settings-delete-profile__close-button" returnBackPath={paths.settings} />
        <div className="settings-delete-profile">
          <Heading rank={1}>
            <FormattedMessage id="settings.head_title/delete" />
          </Heading>

          <p className="settings-delete-profile__delete-message">
            <FormattedMessage id="settings.delete_account_message" />
          </p>

          <Input
            type="password"
            name="password"
            placeholder={intl.formatMessage({ id: 'settings.info_password_placeholder' })}
            input={{
              value: password,
              onChange: onChangePasswordInput,
            }}
          />
          {passwordError && (
            <p className="settings-delete-profile__password-mismatch-message">
              <FormattedMessage id="settings.password_mismatch" />
            </p>
          )}

          <div className="settings-delete-profile__password-and-button">
            <Button
              onClick={onDeleteProfileClick}
              kind="fill"
              size="medium"
              className="settings-delete-profile__remove-profile-button"
              loading={submitting}
              disabled={submitting}
            >
              <FormattedMessage id="settings.delete-profile" />
            </Button>

            <Link to={paths.settings} className="settings-delete-profile__cancel-button">
              <Button kind="fill" size="medium">
                <FormattedMessage id="shared.cancel" />
              </Button>
            </Link>
          </div>
        </div>
      </Content>
    </Page>
  );
};

const SettingsDeleteProfile = hoc(SettingsDeleteProfileComponent);

export default SettingsDeleteProfile;
