import capitalize from 'lodash/capitalize';

import __ from 'ramda/src/__';
import includes from 'ramda/src/includes';

import paths from 'config/paths';
import browseHelper from 'app/pages/browse/browse.helper';
import { renderImageFns } from './card-template.images';

export const isCreator = includes(__, ['creators', 'person']);

const isPlatform = includes(__, ['platforms', 'platform']);

export const getItemPath = (itemType, itemSlug) => {
  const itemPath = browseHelper.itemsPath[itemType];
  return itemPath && itemPath(itemSlug);
};

const getHeadingText = (collectionSlug, intl) =>
  intl.formatMessage({
    id: isCreator(collectionSlug) ? 'person.known_title' : 'catalog.browse_card_title',
  });

const renderHeadingNoticesFns = {
  platforms: (item) => (item.year_end ? `${item.year_start} – ${item.year_end}` : item.year_start),
  creators: ({ positions = [] }) => positions.map(({ name }) => capitalize(name)).join(', '),
  default: () => false,
};

const getHeadingNotice = (collectionSlug, item) =>
  (renderHeadingNoticesFns[collectionSlug] || renderHeadingNoticesFns.default)(item);

const getItemImage = (item, collectionSlug) => (renderImageFns[collectionSlug] || renderImageFns.default)(item);

export const maybeGetItemImage = (item, collectionSlug) => {
  if (item.image || item.avatar || isPlatform(collectionSlug)) {
    return getItemImage(item, collectionSlug);
  }

  return null;
};

export const prepareDataToCardTemplate = ({
  item,
  intl,
  kind,
  titleCentred,
  collectionSlug,
  withImage,
  isPhoneSize,
  ...rest
}) => ({
  image: maybeGetItemImage(item, collectionSlug),
  backgroundImage: item.image_background,
  heading: {
    text: item.name,
    path: getItemPath(collectionSlug, item.slug),
  },
  headingNotice: getHeadingNotice(collectionSlug, item),
  itemsHeading: {
    text: getHeadingText(collectionSlug, intl),
    count: item.games_count,
  },
  items: item.games.map((game) => ({
    text: game.name,
    path: paths.game(game.slug),
    count: game.added,
    countWithIcon: true,
  })),
  flexibleHeight: isPhoneSize,
  titleCentred,
  kind,
  withImage,
  item,
  ...rest,
});
