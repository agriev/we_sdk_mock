import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader';
import cn from 'classnames';
import pick from 'lodash/pick';
import omit from 'lodash/omit';

import EventContainer from 'app/components/event-container';
import EventHeader from 'app/components/event-header';
import ReviewForm from 'app/components/review-form/review-form';

import { createReview } from 'app/components/review-form/review-form.actions';

import './activity-review-form.styl';

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

const ActivityReviewForm = ({ className, users, user, onCancel, dispatch }) => {
  const onCreateReview = (options) =>
    dispatch(
      createReview({
        ...omit(options, 'game'),
        ...pick(options.game, ['id', 'name', 'slug']),
        redirect: false,
      }),
    ).then((review) => {
      if (!review) {
        return;
      }

      onCancel();
    });

  return (
    <EventContainer
      className={cn(['activity__review-form', className])}
      header={
        <EventHeader
          user={user}
          users={users}
          emoji={false}
          rightElement={
            <div className="activity__review-form__cancel" onClick={onCancel} role="button" tabIndex={0}>
              <FormattedMessage id="shared.cancel" />
            </div>
          }
        >
          <FormattedMessage id="activity.button_review" />
        </EventHeader>
      }
    >
      <ReviewForm onSubmit={onCreateReview} selectGame />
    </EventContainer>
  );
};

ActivityReviewForm.propTypes = componentPropertyTypes;
ActivityReviewForm.defaultProps = defaultProps;

export default hot(module)(ActivityReviewForm);
