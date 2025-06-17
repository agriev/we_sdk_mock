import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import UserCardSimilar from 'app/ui/user-card-similar';

import './similar-players-list.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  users: PropTypes.arrayOf(PropTypes.shape({})),
};

const defaultProps = {
  className: '',
  users: {},
};

const SimilarPlayersList = ({ className, users }) => {
  return (
    <div className={cn('similar-players-list', className)}>
      <div className="similar-players-list__header">
        <FormattedMessage id="activity.similar_players" />
        {/* <div className="similar-players-list__header-counter">{users.count}</div> */}
      </div>
      {users &&
        users.map((user) => <UserCardSimilar user={user} key={user.id} className="similar-players-list__item" />)}
    </div>
  );
};

SimilarPlayersList.propTypes = componentPropertyTypes;

SimilarPlayersList.defaultProps = defaultProps;

export default SimilarPlayersList;
