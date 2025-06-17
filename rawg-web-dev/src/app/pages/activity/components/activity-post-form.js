import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader';
import cn from 'classnames';

import EventContainer from 'app/components/event-container';
import EventHeader from 'app/components/event-header';
import PostForm from 'app/components/post-form/post-form';

import { createPost } from 'app/components/post-form/post-form.actions';

import './activity-post-form.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  users: PropTypes.shape({}),
  user: PropTypes.shape({}),
  onCancel: PropTypes.func.isRequired,
  dispatch: PropTypes.func.isRequired,
};

const defaultProps = {
  className: '',
  users: {},
  user: {},
};

const ActivityPostForm = ({ className, users, user, onCancel, dispatch }) => {
  const onCreatePost = (options) =>
    dispatch(
      createPost({
        ...options,
        redirect: false,
      }),
    ).then(onCancel);

  return (
    <EventContainer
      className={cn(['activity__post-form', className])}
      header={
        <EventHeader
          user={user}
          users={users}
          emoji={false}
          rightElement={
            <div className="activity__post-form__cancel" onClick={onCancel} role="button" tabIndex={0}>
              <FormattedMessage id="shared.cancel" />
            </div>
          }
        >
          <FormattedMessage id="activity.button_post" />
        </EventHeader>
      }
    >
      <PostForm clean onSubmit={onCreatePost} selectGame />
    </EventContainer>
  );
};

ActivityPostForm.propTypes = componentPropertyTypes;
ActivityPostForm.defaultProps = defaultProps;

export default hot(module)(ActivityPostForm);
