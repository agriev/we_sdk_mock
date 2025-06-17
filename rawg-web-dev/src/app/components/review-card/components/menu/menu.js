/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';

import paths from 'config/paths';

import { Link } from 'app/components/link';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import currentUserType from 'app/components/current-user/current-user.types';
import reviewType from 'app/pages/review/review.types';

import Dropdown from 'app/ui/dropdown';
import MenuButton from 'app/ui/menu-button';
import Confirm from 'app/ui/confirm';

import './menu.styl';

const propTypes = {
  currentUser: currentUserType.isRequired,
  review: reviewType.isRequired,
  remove: PropTypes.func.isRequired,
  showMenu: PropTypes.bool.isRequired,
};

const defaultProps = {};

const menuButton = () => <MenuButton className="review-card__menu-button" kind="inline" />;

// eslint-disable-next-line react/prop-types
const MenuContent = ({ currentUser, review, remove }) => {
  /* eslint-disable react/prop-types */
  const { id, user } = review;

  return (
    <div className="review-card__menu-content">
      {currentUser.id === user.id && (
        <Link
          to={paths.reviewEdit(id)}
          href={paths.reviewEdit(id)}
          className="review-card__menu-content-item"
          rel="nofollow"
        >
          <SimpleIntlMessage id="shared.review_edit" />
        </Link>
      )}
      <Confirm className="review-card__menu-content-item" onConfirm={remove}>
        <SimpleIntlMessage id="shared.review_delete" />
      </Confirm>
    </div>
  );
};

const ReviewCardMenu = ({ currentUser, review, showMenu, remove }) => {
  const { user, can_delete } = review;

  if (!user || !(currentUser.id === user.id || can_delete) || !showMenu) return null;

  const renderMenuContent = () => <MenuContent currentUser={currentUser} review={review} remove={remove} />;

  return (
    <div className="review-card__menu">
      <Dropdown
        renderButton={menuButton}
        renderContent={renderMenuContent}
        containerClassName="review-card__menu-dropdown-container"
        kind="menu"
      />
    </div>
  );
};

ReviewCardMenu.propTypes = propTypes;
ReviewCardMenu.defaultProps = defaultProps;

export default ReviewCardMenu;
