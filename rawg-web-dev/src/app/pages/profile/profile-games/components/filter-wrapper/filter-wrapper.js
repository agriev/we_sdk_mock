import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { injectIntl } from 'react-intl';

import { appSizeType } from 'app/pages/app/app.types';
import intlShape from 'tools/prop-types/intl-shape';

import Filter from 'app/ui/filter';

import './filter-wrapper.styl';

const propTypes = {
  profile: PropTypes.shape().isRequired,
  filter: PropTypes.shape().isRequired,
  handleFilterChange: PropTypes.func.isRequired,
  toggleEditing: PropTypes.func.isRequired,
  editing: PropTypes.bool,
  isCurrentUser: PropTypes.bool,
  size: appSizeType.isRequired,
  intl: intlShape.isRequired,
};

const defaultProps = {
  editing: false,
  isCurrentUser: false,
};

// Мы пока выключили кнопку редактирования, т.к. пока планируем сконцентрироваться на
// других аспектах профиля пользователя, но в будущем у наас может возникнуть желание
// вернуть этот функционал в проект.
const editButtonEnabled = false;

@injectIntl
export default class FilterWrapper extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  renderEditButton() {
    if (editButtonEnabled === false) {
      return null;
    }

    const { intl, editing, toggleEditing } = this.props;

    return (
      <div className="profile-games__filter-button" onClick={toggleEditing} role="button" tabIndex={0}>
        {intl.formatMessage({
          id: `${editing ? 'profile.edit_games_done' : 'profile.edit_games'}`,
        })}
      </div>
    );
  }

  render() {
    const { profile, size, filter, isCurrentUser, editing, handleFilterChange } = this.props;

    return (
      <div className="profile-games__filter">
        <div className="profile-games__filter-inner">
          <Filter
            filter={filter}
            size={size}
            content={profile}
            button={isCurrentUser ? this.renderEditButton() : null}
            disabled={editing}
            onChange={handleFilterChange}
            enableSortByUserRating
          />
        </div>
      </div>
    );
  }
}
