/* eslint-disable camelcase */

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { reduxForm, Field, formValueSelector, propTypes } from 'redux-form';
import { injectIntl, FormattedMessage, FormattedHTMLMessage } from 'react-intl';
import { hot } from 'react-hot-loader/root';

import paths from 'config/paths';

import currentUserType from 'app/components/current-user/current-user.types';

import throwValidationError from 'tools/throw-validation-error';

import {
  addNotification,
  NOTIF_STATUS_SUCCESS,
  EXPIRES_IMMEDIATELY,
} from 'app/pages/app/components/notifications/notifications.actions';

import { LOCAL_PROFILE_SAVED_ID } from 'app/pages/app/components/notifications/notifications.constants';

import Button from 'app/ui/button';
import Input from 'app/ui/input';
import Error from 'app/ui/error';
import Avatar from 'app/ui/avatar';
import Textarea from 'app/ui/textarea';

import { changeInfo } from '../settings.actions';

const formCode = 'settings-info';

const submit = (values, dispatch) => {
  const { full_name, username, avatar, bio } = values;

  return dispatch(
    changeInfo({
      full_name,
      username,
      avatar,
      bio,
    }),
  ).catch(throwValidationError);
};

const selector = formValueSelector(formCode);

const settingsInfoFormPropertyTypes = {
  ...propTypes,
  currentUser: currentUserType.isRequired,
};

const settingsInfoFormDefaultProperties = {};

@hot
@connect((state) => ({
  currentUser: state.currentUser,
  avatarFile: selector(state, 'avatar'),
}))
@reduxForm({
  form: formCode,
  persistentSubmitErrors: true,
  onSubmitSuccess: (result, dispatch, props) => {
    dispatch(props.change('bio', result.bio_raw));

    const {
      currentUser: { slug },
    } = props;

    dispatch(
      addNotification({
        id: LOCAL_PROFILE_SAVED_ID,
        weight: 8,
        authenticated: true,
        expires: EXPIRES_IMMEDIATELY,
        local: true,
        fixed: true,
        status: NOTIF_STATUS_SUCCESS,
        message: <FormattedHTMLMessage id="settings.info_success" values={{ profileLink: paths.profile(slug) }} />,
      }),
    );
  },
})
@injectIntl
export default class SettingsInfoForm extends Component {
  static propTypes = settingsInfoFormPropertyTypes;

  static defaultProps = settingsInfoFormDefaultProperties;

  constructor(props) {
    super(props);

    this.state = {
      avatarChanged: false,
      avatarSrc: '',
    };
  }

  componentDidMount() {
    this.reader = new FileReader();
    this.reader.addEventListener('load', this.handleLoadAvatar);

    const {
      dispatch,
      initialize,
      currentUser: { full_name, username, bio_raw },
    } = this.props;

    dispatch(initialize({ full_name, username, bio: bio_raw }));
  }

  componentDidUpdate(previousProperties) {
    if (this.props.currentUser.id === previousProperties.currentUser.id) {
      return;
    }

    const { dispatch, initialize, currentUser } = this.props;
    const { full_name, username, bio_raw } = currentUser;

    dispatch(initialize({ full_name, username, bio: bio_raw }));
  }

  handleLoadAvatar = (e) => {
    this.setState({
      avatarChanged: true,
      avatarSrc: e.target.result,
    });
  };

  handleDeleteAvatar = (e) => {
    e.preventDefault();

    this.props.change('avatar', null);

    this.setState({
      avatarChanged: true,
      avatarSrc: '',
    });
  };

  render() {
    const { intl, avatarFile, submitting, handleSubmit, error, currentUser } = this.props;

    const { avatarChanged } = this.state;
    let { avatarSrc } = this.state;

    avatarSrc = avatarChanged ? avatarSrc : currentUser.avatar;

    if (avatarFile && avatarFile !== this.avatarFile) {
      this.avatarFile = avatarFile;
      this.reader.readAsDataURL(avatarFile);
    }

    return (
      <form className="settings-info-form" onSubmit={handleSubmit(submit)}>
        <div className="settings-info-form__avatar">
          <div className="settings-info-form__avatar-label">
            <FormattedMessage id="settings.info_avatar" />
          </div>
          <div className="settings-info-form__avatar-field">
            <Avatar src={avatarSrc} profile={currentUser} />
            {/* {avatarSrc && ( */}
            {/*  <div */}
            {/*    className="settings-info-form__avatar-delete" */}
            {/*    role="button" */}
            {/*    tabIndex={0} */}
            {/*    onClick={this.handleDeleteAvatar} */}
            {/*  > */}
            {/*    <FormattedMessage id="settings.info_avatar_delete" /> */}
            {/*  </div> */}
            {/* )} */}
            {/* <div className="settings-info-form__avatar-file"> */}
            {/*  <Field type="file" name="avatar" component={FileInput} /> */}
            {/*  <FormattedMessage id="settings.info_avatar_upload" /> */}
            {/* </div> */}
          </div>
        </div>
        <div className="settings-info-form__name-inputs">
          {/* <Field */}
          {/*  type="text" */}
          {/*  name="full_name" */}
          {/*  placeholder={intl.formatMessage({ id: 'settings.info_name_placeholder' })} */}
          {/*  component={Input} */}
          {/* /> */}
          {/* <Field */}
          {/*  type="text" */}
          {/*  name="username" */}
          {/*  placeholder={intl.formatMessage({ id: 'settings.info_username_placeholder' })} */}
          {/*  component={Input} */}
          {/* /> */}
        </div>
        {error && error.map((e) => <Error error={e} kind="form" key={e} />)}

        <div className="settings-info-form__bio-container">
          <Field
            name="bio"
            placeholder={intl.formatMessage({ id: 'settings.bio_textarea_placeholder' })}
            component={Textarea}
            maxLength={512}
          />
        </div>

        <div className="settings-info-form__buttons">
          <Button type="submit" kind="fill" size="medium" loading={submitting} disabled={submitting}>
            <FormattedMessage id="settings.info_button" />
          </Button>
        </div>

        {/* <Link to={paths.deleteProfile} className="settings-info-form__buttons__delete-profile"> */}
        {/*  <FormattedMessage id="settings.info_button_delete" /> */}
        {/* </Link> */}
      </form>
    );
  }
}
