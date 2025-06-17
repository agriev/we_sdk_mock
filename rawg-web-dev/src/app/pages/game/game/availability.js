import React from 'react';
import PropTypes from 'prop-types';
import { pure } from 'recompose';
import { FormattedMessage } from 'react-intl';
import SVGInline from 'react-svg-inline';

import get from 'lodash/get';

import len from 'tools/array/len';

import { getStoreIcon } from 'app/pages/game/game.helper';

import Heading from 'app/ui/heading';

import { stores as storesType } from 'app/pages/game/game.types';
import { visitedStoreEvent } from 'app/pages/game/game.actions';
import { currentUserIdType } from 'app/components/current-user/current-user.types';

const componentPropertyTypes = {
  stores: storesType,
  gameId: PropTypes.number,
  dispatch: PropTypes.func.isRequired,
  currentUserId: currentUserIdType,
};

const componentDefaultProperties = {
  stores: [],
  gameId: undefined,
  currentUserId: undefined,
};

const GameAvailabilityBlock = ({ stores, gameId, dispatch, currentUserId }) => {
  if (len(stores) === 0 || !get(stores, '[0].store.name')) {
    return null;
  }

  return (
    <div className="game__availability">
      <Heading rank={2} className="game__block-title game__availability-title">
        <FormattedMessage id="game.available" />
      </Heading>
      <div className="game__availability-inner">
        {stores.map((storeItem) => {
          const { store, url } = storeItem;
          const icon = getStoreIcon(store.slug);

          return (
            <div
              // itemProp="installUrl"
              role="button"
              tabIndex="0"
              className="game__availability-item"
              onClick={() => {
                window.open(url, '_blank');

                if (currentUserId) {
                  dispatch(visitedStoreEvent(store.id, gameId));
                }
              }}
              // href={url}
              // target="_blank"
              // rel="noopener noreferrer"
              key={store.id}
            >
              {store.name}
              {icon && <SVGInline svg={icon} className={`game__availability-icon ${store.slug}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

GameAvailabilityBlock.propTypes = componentPropertyTypes;
GameAvailabilityBlock.defaultProps = componentDefaultProperties;

export default pure(GameAvailabilityBlock);
