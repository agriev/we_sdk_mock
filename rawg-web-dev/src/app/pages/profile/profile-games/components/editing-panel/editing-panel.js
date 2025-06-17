import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { injectIntl, FormattedMessage } from 'react-intl';
import cn from 'classnames';
import noop from 'lodash/noop';

import appHelper from 'app/pages/app/app.helper';
import Button from 'app/ui/button';
import CloseButton from 'app/ui/close-button';
import Arrow from 'app/ui/arrow';
import Select from 'app/ui/select';

import { platforms as appPlatformsType, appSizeType } from 'app/pages/app/app.types';
import intlShape from 'tools/prop-types/intl-shape';

import './editing-panel.styl';

const propTypes = {
  size: appSizeType.isRequired,
  platforms: appPlatformsType.isRequired,
  statuses: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  collections: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  action: PropTypes.string.isRequired,
  selectedGames: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  editedGamesCount: PropTypes.number.isRequired,
  toggleEditing: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
  handlePlatformsChange: PropTypes.func.isRequired,
  handlePlatformsClose: PropTypes.func.isRequired,
  handleCollectionsOpen: PropTypes.func.isRequired,
  handleCollectionsChange: PropTypes.func.isRequired,
  handleCollectionsClose: PropTypes.func.isRequired,
  handleCollectionsSearch: PropTypes.func.isRequired,
  handleStatusChange: PropTypes.func.isRequired,
  unselect: PropTypes.func.isRequired,
  undo: PropTypes.func.isRequired,
  intl: intlShape.isRequired,
};

@injectIntl
export default class EditingPanel extends Component {
  static propTypes = propTypes;

  constructor(props) {
    super(props);

    this.state = {
      editingPanelExpanded: false,
    };
  }

  toggleEditingPanel = () => {
    this.setState((state) => ({ editingPanelExpanded: !state.editingPanelExpanded }));
  };

  renderArrow() {
    const { editingPanelExpanded } = this.state;

    return (
      <div className="profile-games__editing-panel-arrow" onClick={this.toggleEditingPanel} role="button" tabIndex={0}>
        <Arrow size="medium" direction={editingPanelExpanded ? 'bottom' : 'top'} />
      </div>
    );
  }

  renderUndo() {
    const { action, selectedGames, undo, unselect } = this.props;

    if (action) {
      return (
        <span className="profile-games__editing-panel-undo" onClick={undo} role="button" tabIndex={0}>
          <FormattedMessage id="profile.edit_games_undo" />
        </span>
      );
    }

    return selectedGames.length > 0 ? (
      <span className="profile-games__editing-panel-undo" onClick={unselect} role="button" tabIndex={0}>
        <FormattedMessage id="profile.edit_games_unselect" />
      </span>
    ) : null;
  }

  renderInfoPanel() {
    const { size, action, editedGamesCount } = this.props;

    return (
      <div className="profile-games__editing-panel-info">
        <div>
          <FormattedMessage
            id={`profile.edit_games_action_${action || 'selected'}`}
            values={{ count: editedGamesCount || '0' }}
          />
          {appHelper.isPhoneSize({ size }) && <br />}
          {this.renderUndo()}
        </div>
        {appHelper.isPhoneSize({ size }) && this.renderArrow()}
      </div>
    );
  }

  renderSelect({ messageId, contentItems, onSearch, handlers, multiple = true, saveActive = true }) {
    const { intl } = this.props;

    const message = intl.formatMessage({ id: messageId });

    return (
      <Select
        className="profile-games__editing-select"
        kind="multiple-editing"
        button={{
          className: 'profile-games__editing-button',
          kind: 'outline',
          placeholder: message,
          value: '',
        }}
        content={{
          className: 'profile-games__editing-content',
          title: message,
          items: contentItems,
          search: !!onSearch,
          onSearch: onSearch || noop,
        }}
        multiple={multiple}
        saveActive={saveActive}
        {...handlers}
      />
    );
  }

  renderDeleteButton() {
    const { handleDelete } = this.props;

    return (
      <div className="profile-games__delete-button" onClick={handleDelete} role="button" tabIndex={0}>
        <FormattedMessage id="profile.edit_games_delete" />
      </div>
    );
  }

  renderSelectPanel() {
    const {
      platforms = [],
      statuses,
      collections,
      selectedGames,
      handlePlatformsChange,
      handlePlatformsClose,
      handleCollectionsOpen,
      handleCollectionsChange,
      handleCollectionsClose,
      handleCollectionsSearch,
      handleStatusChange,
    } = this.props;

    const className = cn('profile-games__editing-panel-selects', {
      'profile-games__editing-panel-selects_disabled': !Array.isArray(selectedGames) && selectedGames.length > 0,
    });

    const collectionItems = collections.map((collection) => ({
      id: collection.id,
      value: collection.name,
      active: false,
    }));

    const platformsItems = platforms.map((platform) => ({
      id: platform.id,
      value: platform.name,
      active: false,
    }));

    return (
      <div className={className}>
        {this.renderSelect({
          messageId: 'profile.edit_games_status',
          contentItems: statuses,
          handlers: {
            onChange: handleStatusChange,
          },
          multiple: false,
          saveActive: false,
        })}

        {this.renderSelect({
          messageId: 'profile.edit_games_collections',
          contentItems: collectionItems,
          onSearch: handleCollectionsSearch,
          handlers: {
            onOpen: handleCollectionsOpen,
            onChange: handleCollectionsChange,
            onClose: handleCollectionsClose,
          },
        })}

        {this.renderSelect({
          messageId: 'profile.edit_games_platforms',
          contentItems: platformsItems,
          handlers: {
            onChange: handlePlatformsChange,
            onClose: handlePlatformsClose,
          },
        })}

        {this.renderDeleteButton()}
      </div>
    );
  }

  renderMobileCloseButton() {
    const { toggleEditing } = this.props;

    return (
      <Button className="profile-games__editing-panel-close" size="medium" kind="fill-inline" onClick={toggleEditing}>
        <FormattedMessage id="profile.edit_games_done" />
      </Button>
    );
  }

  renderDesktopCloseButton() {
    const { toggleEditing } = this.props;

    return <CloseButton className="profile-games__editing-panel-close" size="small" onClick={toggleEditing} />;
  }

  render() {
    const { size } = this.props;
    const { editingPanelExpanded } = this.state;
    const isDesktop = appHelper.isDesktopSize({ size });

    return (
      <div className="profile-games__editing-panel">
        <div className="profile-games__editing-panel-content">
          {this.renderInfoPanel()}
          {(isDesktop || editingPanelExpanded) && this.renderSelectPanel()}
          {!isDesktop && editingPanelExpanded && this.renderMobileCloseButton()}
          {isDesktop && this.renderDesktopCloseButton()}
        </div>
      </div>
    );
  }
}
