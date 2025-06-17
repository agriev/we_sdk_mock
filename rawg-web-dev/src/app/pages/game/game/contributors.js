import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import len from 'tools/array/len';

import Heading from 'app/ui/heading';

import UserCardSimilar from 'app/ui/user-card-similar';
import { currentUserIdType } from 'app/components/current-user/current-user.types';

const componentPropertyTypes = {
  contributors: PropTypes.arrayOf(PropTypes.object),
  currentUserId: currentUserIdType,
};

const componentDefaultProperties = {
  contributors: [],
  currentUserId: undefined,
};

const GameContributorsBlock = ({ contributors, currentUserId }) => {
  if (len(contributors) === 0) {
    return null;
  }

  const message = useCallback((user, contributor) => {
    return <FormattedMessage id="game.n-edits" values={{ count: contributor.editing_count }} />;
  }, []);

  return (
    <div className="game__contributors">
      <Heading rank={2} className="game__block-title game__contributors-title">
        <FormattedMessage id="game.top-contributors" />
      </Heading>
      <div className="game__contributors-inner">
        {contributors.map((contributor) => {
          return (
            <UserCardSimilar
              user={contributor.user}
              message={message}
              messageArgument={contributor}
              key={contributor.user.id}
              enableFollowButton={currentUserId !== contributor.user.id}
              className="game__contributors__item"
            />
          );
        })}
      </div>
    </div>
  );
};

GameContributorsBlock.propTypes = componentPropertyTypes;
GameContributorsBlock.defaultProps = componentDefaultProperties;

export default GameContributorsBlock;
