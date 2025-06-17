/* global document */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import classnames from 'classnames';
import { FormattedMessage } from 'react-intl';
import YouTube from 'react-youtube';
import appHelper from 'app/pages/app/app.helper';
import AspectRatioContainer16x9 from 'app/ui/aspect-ratio-container-16x9';
import CloseButton from 'app/ui/close-button';
import Button from 'app/ui/button';
import getAppContainer from 'tools/get-app-container';

import './game-accounts-verification-helpblocks.styl';

const steamHelpMovies = [
  {
    external_id: 'qIuePt6-TN4',
    thumbnails: {
      medium: {
        url: 'http://i.ytimg.com/vi/qIuePt6-TN4/0.jpg',
      },
    },
  },
  {
    external_id: 'r90Chb5CiQY',
    thumbnails: {
      medium: {
        url: 'http://i.ytimg.com/vi/r90Chb5CiQY/0.jpg',
      },
    },
  },
];

const psnHelpMovies = [
  {
    external_id: 'j0HqCXYufN8',
    thumbnails: {
      medium: {
        url: 'http://i.ytimg.com/vi/j0HqCXYufN8/0.jpg',
      },
    },
  },
];

const xboxHelpMovies = [
  {
    external_id: 'h3paQtRv4iI',
    thumbnails: {
      medium: {
        url: 'http://i.ytimg.com/vi/h3paQtRv4iI/0.jpg',
      },
    },
  },
];

const youtubePlayerOptions = {
  width: '100%',
  height: '100%',
  playerVars: {
    showinfo: 0,
  },
};

const BlocksContent = ({ activeInputName }) => {
  switch (activeInputName) {
    case 'steam':
      return (
        <div>
          <AspectRatioContainer16x9>
            <YouTube videoId={steamHelpMovies[0].external_id} opts={youtubePlayerOptions} />
          </AspectRatioContainer16x9>
          <h2>
            <FormattedMessage id="game_accounts.steam_help_step1_title" />
          </h2>
          <div className="game-accounts-verification-helpblocks__text">
            <FormattedMessage id="game_accounts.steam_help_step1_text" />
          </div>
          <AspectRatioContainer16x9>
            <YouTube videoId={steamHelpMovies[1].external_id} opts={youtubePlayerOptions} />
          </AspectRatioContainer16x9>
          <h2>
            <FormattedMessage id="game_accounts.steam_help_step2_title" />
          </h2>
          <div className="game-accounts-verification-helpblocks__text">
            <FormattedMessage id="game_accounts.steam_help_step2_text" />
          </div>
        </div>
      );
    case 'psn':
      return (
        <div>
          <AspectRatioContainer16x9>
            <YouTube videoId={psnHelpMovies[0].external_id} opts={youtubePlayerOptions} />
          </AspectRatioContainer16x9>
          <h2>
            <FormattedMessage id="game_accounts.psn_help_step1_title" />
          </h2>
          <div className="game-accounts-verification-helpblocks__text">
            <FormattedMessage id="game_accounts.psn_help_step1_text" />
          </div>
        </div>
      );
    case 'xbox':
      return (
        <div>
          <AspectRatioContainer16x9>
            <YouTube videoId={xboxHelpMovies[0].external_id} opts={youtubePlayerOptions} />
          </AspectRatioContainer16x9>
          <h2>
            <FormattedMessage id="game_accounts.xbox_help_step1_title" />
          </h2>
          <div className="game-accounts-verification-helpblocks__text">
            <FormattedMessage id="game_accounts.xbox_help_step1_text" />
          </div>
        </div>
      );
    default:
      return <div />;
  }
};

BlocksContent.propTypes = {
  activeInputName: PropTypes.string.isRequired,
};

const containerClassName = ({ className, activeInputName }) =>
  classnames([
    'game-accounts-verification-helpblocks',
    className,
    {
      active: activeInputName,
      [`game-accounts-verification-helpblocks_${activeInputName}`]: activeInputName,
    },
  ]);

const hoc = compose(
  connect((state) => ({
    size: state.app.size,
  })),
);

const componentPropertyTypes = {
  size: PropTypes.string.isRequired,
  className: PropTypes.string,
  activeInputName: PropTypes.string,
  setActiveInputName: PropTypes.func,
};

const defaultProps = {
  className: '',
  activeInputName: undefined,
  setActiveInputName: undefined,
};

const GameAccountsVerificationHelpblocks = ({ size, className, activeInputName, setActiveInputName }) => {
  const closeHelpBlock = () => {
    setActiveInputName(undefined);
  };

  if (appHelper.isPhoneSize({ size }) && typeof document !== 'undefined') {
    getAppContainer().style.overflow = activeInputName ? 'hidden' : '';
  }

  return (
    <div className={containerClassName({ className, activeInputName })}>
      <div className="game-accounts-verification-helpblocks__innercontent">
        <CloseButton onClick={closeHelpBlock} />
        <BlocksContent activeInputName={activeInputName} />
        <Button
          className="game-accounts-verification-helpblocks__button-back"
          type="submit"
          kind="fill"
          size="medium"
          onClick={closeHelpBlock}
        >
          <FormattedMessage id="shared.button_action_back" />
        </Button>
      </div>
    </div>
  );
};

GameAccountsVerificationHelpblocks.propTypes = componentPropertyTypes;
GameAccountsVerificationHelpblocks.defaultProps = defaultProps;

export default hoc(GameAccountsVerificationHelpblocks);
