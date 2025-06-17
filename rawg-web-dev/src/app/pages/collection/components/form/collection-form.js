import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import classnames from 'classnames';
import { FormattedMessage, injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader/root';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import Button from 'app/ui/button';
import Error from 'app/ui/error';
import Confirm from 'app/ui/confirm';
import Checkbox from 'app/ui/checkbox';

import './collection-form.styl';

import currentUserType from 'app/components/current-user/current-user.types';
import paths from 'config/paths';

import intlShape from 'tools/prop-types/intl-shape';

import { removeCollection } from '../../collection.actions';

const FIELD_INPUT_MAX_LENGTH = 200;
const FIELD_TEXTAREA_MAX_LENGTH = 1000;
const FIELD_REMAINDER_LENGTH = 10;

@hot
@connect((state) => ({
  currentUser: state.currentUser,
  collection: state.collection,
}))
@injectIntl
export default class CollectionForm extends Component {
  static propTypes = {
    collection: PropTypes.shape().isRequired,
    onSubmit: PropTypes.func.isRequired,
    showRemoveButton: PropTypes.bool,
    isEdit: PropTypes.bool,
    dispatch: PropTypes.func.isRequired,
    currentUser: currentUserType.isRequired,
    intl: intlShape.isRequired,
  };

  static defaultProps = {
    showRemoveButton: false,
    isEdit: false,
  };

  constructor(props) {
    super(props);

    const { isEdit } = this.props;

    this.state = {
      isPrivate: false,
      title: '',
      description: '',
      loading: false,
    };

    if (isEdit) {
      const { collection = {} } = props;
      const { id, is_private: isPrivate = false, name: title = '', description_raw: description = '' } = collection;

      this.state.id = id;
      this.state.title = title;
      this.state.isPrivate = isPrivate;
      this.state.description = description;
    }
  }

  static getDerivedStateFromProps(props, state) {
    const { collection, isEdit } = props;
    const { id, is_private: isPrivate, name: title, description_raw: description = '' } = collection;

    const idReceived = isEdit && !!id && !state.title && !state.description;
    const idRemoved = isEdit && !id && !!state.title && !!state.description;

    if (idReceived || idRemoved) {
      return {
        id,
        title,
        description,
        isPrivate,
      };
    }

    return null;
  }

  handleInput = (e) => {
    this.setState({ title: e.target.value });
  };

  handleTextarea = (e) => {
    this.setState({ description: e.target.value });
  };

  handlePrivateCheckbox = (checked) => {
    this.setState({ isPrivate: checked });
  };

  handleSubmit = (e) => {
    e.preventDefault();

    this.setState({ loading: true });

    const { onSubmit } = this.props;
    const { title, description, isPrivate } = this.state;

    onSubmit({
      title,
      description,
      isPrivate,
    }).catch((error) => {
      /* eslint-disable no-console */
      console.error(error);
      this.setState({ loading: false });
    });
  };

  remove = () => {
    const { dispatch, currentUser, collection } = this.props;

    dispatch(removeCollection(collection.id)).then(() => {
      dispatch(push(paths.profileCollections(currentUser.username)));
    });
  };

  renderFieldCounter = (count, maxCount, name) => {
    const remainder = maxCount - count;

    const className = classnames('collection-form__counter', {
      'collection-form__counter_warning': remainder <= FIELD_REMAINDER_LENGTH,
      [`collection-form__counter_${name}`]: name,
    });

    return <div className={className}>{remainder}</div>;
  };

  render() {
    const { collection: { errors = {} } = {}, showRemoveButton, isEdit, intl } = this.props;
    const { title, description, loading, isPrivate } = this.state;

    return (
      <div className="collection-form">
        <form className="collection-form__form" onSubmit={this.handleSubmit}>
          {isEdit && (
            <SimpleIntlMessage
              id="collection.head_title_edit"
              className="collection-form__title"
              values={{ name: title }}
            />
          )}
          {!isEdit && <SimpleIntlMessage id="collection.head_title_create" className="collection-form__title" />}
          <div className="collection-form__filed-title">
            <FormattedMessage id="collection.form_title" />
          </div>
          <div className="collection-form__filed">
            <input
              className="collection-form__input"
              maxLength={FIELD_INPUT_MAX_LENGTH}
              placeholder={intl.formatMessage({
                id: 'collection.form_create_title_placeholder',
              })}
              value={title}
              onChange={this.handleInput}
            />
            {this.renderFieldCounter(title.length, FIELD_INPUT_MAX_LENGTH, 'input')}
            {errors.name && errors.name.length > 0 && <Error kind="filed" error={errors.name[0]} />}
          </div>
          <div className="collection-form__field-checkbox">
            <Checkbox
              checked={isPrivate}
              label={<FormattedMessage id="collection.form_private-checkbox" />}
              onChange={this.handlePrivateCheckbox}
            />
          </div>
          <div className="collection-form__filed-title">
            <FormattedMessage id="collection.form_description" />
          </div>
          <div className="collection-form__filed collection-form__filed_textarea">
            <textarea
              className="collection-form__textarea"
              placeholder={intl.formatMessage({
                id: 'collection.form_create_desc_placeholder',
              })}
              maxLength={FIELD_TEXTAREA_MAX_LENGTH}
              value={description}
              onChange={this.handleTextarea}
            />
            {this.renderFieldCounter(description.length, FIELD_TEXTAREA_MAX_LENGTH, 'textarea')}
            {errors.description && errors.description.length > 0 && (
              <Error kind="filed" error={errors.description[0]} />
            )}
          </div>
          <div className="collection-form__button">
            <Button kind="fill" size="medium" disabled={loading} loading={loading}>
              <FormattedMessage id="collection.form_button" />
            </Button>
            {showRemoveButton && (
              <Confirm className="collection-form__remove-button" onConfirm={this.remove}>
                <FormattedMessage id="collection.form_remove_button" />
              </Confirm>
            )}
          </div>
        </form>
      </div>
    );
  }
}
