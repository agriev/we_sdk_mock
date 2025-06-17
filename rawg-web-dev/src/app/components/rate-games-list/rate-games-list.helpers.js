import size from 'lodash/size';
import filter from 'lodash/filter';

import insert from 'ramda/src/insert';
import reject from 'ramda/src/reject';
import equals from 'ramda/src/equals';
import propEq from 'ramda/src/propEq';

import { RATING_EXCEPTIONAL, RATING_RECOMMENDED } from 'app/ui/rate-card/rate-card.helper';

import { userAccountsParams } from 'app/pages/accounts-import/accounts-import.helpers.js';
import { checkHidingStore } from './components/import-games/import-games.helper.js';

export const SHARE_CARD_VISIBILITY_COUNT = 10;
export const SIGNUP_CARD_VISIBILITY_COUNT = 5;

export const isPositive = ({ rating }) => [RATING_RECOMMENDED, RATING_EXCEPTIONAL].includes(rating);

export const countPositivelyRated = (ratedGames) => size(filter(ratedGames, isPositive));

export const getNotConnectedStores = (currentUser) => {
  const result = [];

  userAccountsParams.forEach(({ param, account }) => {
    if (!(currentUser[param] || checkHidingStore(account))) {
      result.push(account);
    }
  });

  return result;
};

const shareRatedEnabled = false;

export const canShowShare = ({ isShareVisible, ratedGames, currentUser }) => {
  if (!shareRatedEnabled) {
    return false;
  }

  if (currentUser.id) {
    return true;
  }

  const positivelyRated = countPositivelyRated(ratedGames);

  return isShareVisible && positivelyRated >= SHARE_CARD_VISIBILITY_COUNT;
};

export const canShowSignup = ({ isSignupVisible, currentUser }) => !currentUser.id && isSignupVisible;

export const canShowImport = ({ isImportVisible, currentUser }) =>
  currentUser.id && isImportVisible && getNotConnectedStores(currentUser).length > 0;

export const addSlide = (slide, index, items) => insert(index, slide, items);

export const addSlideEveryN = (slide, everyIndex, items) => {
  let idx = 0;
  let results = items;

  while (idx <= results.length) {
    idx += 1;

    if (idx % everyIndex === 0) {
      results = insert(idx, slide, results);
    }
  }

  return results;
};

export const removeSlides = (slide, items) => {
  if (typeof slide === 'string') {
    return reject(equals(slide), items);
  }

  return reject(propEq('id', slide.id), items);
};

export const getInitItems = (props, currentSlide) => {
  const {
    currentUser,
    games: { results },
    ratedGames,
    isShareVisible,
    isSignupVisible,
  } = props;

  const shareCardIndex = canShowShare({ isShareVisible, ratedGames, currentUser }) ? currentSlide + 2 : -1;

  const signupCardIndex = canShowSignup({ isSignupVisible, currentUser }) ? currentSlide + 7 : -1;

  let items = [...results];

  if (shareCardIndex !== -1) {
    items = addSlide('share', shareCardIndex, items);
  }

  if (signupCardIndex !== -1) {
    items = addSlideEveryN('signup', 10, items);
  }

  return items;
};
