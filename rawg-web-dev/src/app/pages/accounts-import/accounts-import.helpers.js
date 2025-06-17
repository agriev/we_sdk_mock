/* eslint-disable import/prefer-default-export */

import steamIcon from 'assets/icons/stores/steam.svg';
import psnIcon from 'assets/icons/stores/ps-store.svg';
import xboxIcon from 'assets/icons/stores/xbox.svg';
import gogIcon from 'assets/icons/stores/gog.svg';

const STEAM = 'steam';
const PSN = 'psn';
const XBOX = 'xbox';
const GOG = 'gog';

export const allAccounts = [STEAM, PSN, XBOX, GOG];
const allAccountsNames = ['Steam', 'PSN', 'Xbox Live', 'GOG'];
const allIdsParams = ['steam_id', 'psn_online_id', 'gamer_tag', 'gog'];
export const allStatusParams = ['steam_id_status', 'psn_online_id_status', 'gamer_tag_status', 'gog_status'];

const accountsDataByStatus = {};

export const userAccountsParams = allAccounts.map((account, idx) => {
  const info = {
    param: allIdsParams[idx],
    status: allStatusParams[idx],
    name: allAccountsNames[idx],
    account,
  };

  accountsDataByStatus[allStatusParams[idx]] = info;

  return info;
});

export { accountsDataByStatus };

export const userHasConnections = (user) => userAccountsParams.some(({ param }) => user[param] !== '');

export const importInProgress = (user) => userAccountsParams.some(({ status }) => user[status] === 'process');

export const importStatusChanged = (newUser, oldUser) =>
  userAccountsParams.some(({ status }) => oldUser[status] !== newUser[status]);

export const accountData = (account, currentUser) => {
  const {
    steam_id: steamID,
    steam_id_status: steamIdStatus,
    psn_online_id: psnID,
    psn_online_id_status: psnOnlineIdStatus,
    gamer_tag: gamerTag,
    gamer_tag_status: gamerTagStatus,
    gog,
    gog_status: gogStatus,
  } = currentUser;

  switch (account) {
    case STEAM:
      return {
        id: steamID,
        name: 'Steam',
        status: steamIdStatus,
        icon: steamIcon,
        slug: account,
        accountID: 'steam_id',
      };

    case PSN:
      return {
        id: psnID,
        name: 'PlayStation',
        status: psnOnlineIdStatus,
        icon: psnIcon,
        slug: account,
        accountID: 'psn_online_id',
      };

    case XBOX:
      return {
        id: gamerTag,
        name: 'Xbox',
        status: gamerTagStatus,
        icon: xboxIcon,
        slug: account,
        accountID: 'gamer_tag',
      };

    case GOG:
      return {
        id: gog,
        name: 'GOG',
        status: gogStatus,
        icon: gogIcon,
        slug: account,
        accountID: 'gog',
      };

    default:
      return undefined;
  }
};

export const helpersData = (account) => {
  switch (account) {
    case STEAM:
      return [
        // {
        //   external_id: 'qIuePt6-TN4',
        //   thumbnails: {
        //     medium: {
        //       url: 'http://i.ytimg.com/vi/qIuePt6-TN4/0.jpg',
        //     },
        //   },
        //   messages: {
        //     title: 'game_accounts.steam_help_step1_title',
        //     text: 'game_accounts.steam_help_step1_text',
        //   },
        // },
        {
          external_id: 'r90Chb5CiQY',
          thumbnails: {
            medium: {
              url: 'http://i.ytimg.com/vi/r90Chb5CiQY/0.jpg',
            },
          },
          messages: {
            title: 'game_accounts.steam_help_step2_title',
            text: 'game_accounts.steam_help_step2_text',
          },
        },
      ];

    case PSN:
      return [
        {
          external_id: 'j0HqCXYufN8',
          thumbnails: {
            medium: {
              url: 'http://i.ytimg.com/vi/j0HqCXYufN8/0.jpg',
            },
          },
          messages: {
            title: 'game_accounts.psn_help_step1_title',
            text: 'game_accounts.psn_help_step1_text',
          },
        },
      ];

    case XBOX:
      return [
        {
          external_id: 'h3paQtRv4iI',
          thumbnails: {
            medium: {
              url: 'http://i.ytimg.com/vi/h3paQtRv4iI/0.jpg',
            },
          },
          messages: {
            title: 'game_accounts.xbox_help_step1_title',
            text: 'game_accounts.xbox_help_step1_text',
          },
        },
      ];

    case GOG:
      return [
        {
          external_id: 'BBHFdDm-now',
          thumbnails: {
            medium: {
              url: 'http://i.ytimg.com/vi/BBHFdDm-now/0.jpg',
            },
          },
          messages: {
            title: 'game_accounts.gog_help_step1_title',
            text: 'game_accounts.gog_help_step1_text',
          },
        },
      ];
    default:
      return undefined;
  }
};
