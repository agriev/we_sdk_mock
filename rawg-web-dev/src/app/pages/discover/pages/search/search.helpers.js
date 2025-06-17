import React from 'react';

import upperFirst from 'lodash/upperFirst';
import get from 'lodash/get';

import cond from 'ramda/src/cond';
import propEq from 'ramda/src/propEq';
import always from 'ramda/src/always';
import pipe from 'ramda/src/pipe';
import prop from 'ramda/src/prop';
import map from 'ramda/src/map';
import join from 'ramda/src/join';

import paths from 'config/paths';

import CardTemplate from 'app/components/card-template';
import GameCardMedium from 'app/components/game-card-medium';
import CollectionCard from 'app/ui/collection-card-new';
import { maybeGetItemImage } from 'app/components/card-template/card-template.lib';

export const itemsPaths = {
  publisher: paths.publisher,
  developer: paths.developer,
  person: paths.creator,
  genre: paths.genre,
  platform: paths.platform,
  tag: paths.tag,
  collection: paths.collection,
  user: paths.profile,
  game: paths.game,
  store: paths.store,
};

export const renderCardTemplate = ({ intl, onFollowClick, currentUser }) => (item) => {
  const isCreator = item.instance === 'person';
  const isPlayer = item.instance === 'user';
  const personPositions = pipe(
    prop('positions'),
    map(
      pipe(
        prop('name'),
        upperFirst,
      ),
    ),
    join(', '),
  );

  const isCurrentUser = isPlayer && item.slug === currentUser.slug;
  const following = isCurrentUser ? undefined : item.following;

  const headingText = intl.formatMessage({
    id: isCreator ? 'person.known_title' : 'catalog.browse_card_title',
  });

  const headingNotice = cond([
    [propEq('instance', 'publisher'), always('Publisher')],
    [propEq('instance', 'developer'), always('Developer')],
    [propEq('instance', 'person'), personPositions],
    [propEq('instance', 'genre'), always('Genre')],
    [propEq('instance', 'platform'), always('Platform')],
    [propEq('instance', 'tag'), always('Tag')],
    [propEq('instance', 'user'), always('Player')],
  ]);

  return (
    <CardTemplate
      key={`${item.instance}-${item.slug}`}
      image={maybeGetItemImage(item, item.instance)}
      backgroundImage={item.image_background || item.background_image}
      kind={isCreator ? 'big' : 'medium'}
      titleCentred={!isCreator}
      withImage={isCreator || isPlayer}
      headingNotice={headingNotice(item)}
      flexibleHeight
      heading={{
        text: item.name || item.full_name || item.username,
        path: itemsPaths[item.instance](item.slug),
      }}
      itemsHeading={{
        text: headingText,
        count: item.games_count,
      }}
      items={
        item.games &&
        item.games.map((game) => ({
          text: game.name,
          path: paths.game(game.slug),
          count: game.added,
          countWithIcon: true,
        }))
      }
      following={following}
      onFollowClick={onFollowClick}
      followLoading={item.followLoading}
      item={item}
    />
  );
};

export const renderGameCard = ({ appSize, currentUser, dispatch, allRatings }) => (game) => (
  <GameCardMedium
    key={`game-${game.slug}`}
    appSize={appSize}
    currentUser={currentUser}
    dispatch={dispatch}
    game={game}
    allRatings={allRatings}
  />
);

export const renderCollectionCard = ({ appSize, currentUser, onFollowClick }) => (collection) => (
  <CollectionCard
    key={`collection-${collection.slug}`}
    size={appSize}
    kind="float"
    collection={collection}
    followingEnabled={get(collection, 'creator.slug') !== currentUser.slug}
    onFollowClick={onFollowClick}
  />
);
