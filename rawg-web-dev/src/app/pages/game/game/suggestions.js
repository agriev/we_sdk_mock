import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { pure, compose } from 'recompose';
import { Link } from 'app/components/link';
import { Element } from 'react-scroll';

import paths from 'config/paths';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import ListLoader from 'app/ui/list-loader';
import Heading from 'app/ui/heading';

import GameCardMediumList from 'app/components/game-card-medium-list';

import getPagesCount from 'tools/get-pages-count';
import { suggestions as suggestionsType, slug as slugType } from 'app/pages/game/game.types';
import currentUserType from 'app/components/current-user/current-user.types';

import len from 'tools/array/len';

const PAGE_SIZE = 9;

const hoc = compose(pure);

const componentPropertyTypes = {
  suggestions: suggestionsType,
  slug: slugType,
  name: PropTypes.string.isRequired,
  dispatch: PropTypes.func.isRequired,
  currentUser: currentUserType.isRequired,
  suggestedGames: PropTypes.arrayOf(PropTypes.shape().isRequired).isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  load: PropTypes.func.isRequired,
  appSize: PropTypes.string.isRequired,
  isOnline: PropTypes.bool,
};

const componentDefaultProperties = {
  suggestions: {
    count: 0,
    results: [],
  },
  slug: '',
};

const GameSuggestionsBlockComponent = ({
  slug,
  name,
  suggestions,
  dispatch,
  currentUser,
  suggestedGames,
  load,
  appSize,
  allRatings,
  isOnline = false,
}) => {
  if (len(suggestedGames) === 0) return null;

  const { count, next, loading } = suggestions;
  const url = paths.gameSuggestions(slug);
  const loadNext = useCallback(() => load(PAGE_SIZE), [PAGE_SIZE]);

  const HeadingComponent = isOnline ? 'div' : Link;

  const currentGames = useMemo(() => {
    if (!isOnline) {
      return suggestedGames;
    }

    return suggestedGames.map((game) => {
      return {
        ...game,
        slug: `${game.slug}?utm_source=more-games&utm_medium=website&utm_campaign=crosspromo`,
      };
    });
  }, [suggestedGames, isOnline]);

  return (
    <div className="game__suggestions">
      <Element name="suggestions" />
      <Heading className="game__suggestions-heading-h" rank={2}>
        <HeadingComponent className="game__suggestions-heading-link" to={url}>
          {isOnline ? (
            <div className="game__suggestions-heading">Больше игр</div>
          ) : (
            <SimpleIntlMessage className="game__suggestions-heading" id="game.suggestions_title" values={{ name }} />
          )}
        </HeadingComponent>
      </Heading>
      <div className="game__suggestions-games">
        <ListLoader
          load={loadNext}
          count={count}
          next={next}
          loading={loading}
          pages={getPagesCount(count, PAGE_SIZE)}
          showSeoPagination={false}
        >
          <GameCardMediumList
            columns={3}
            games={currentGames}
            currentUser={currentUser}
            dispatch={dispatch}
            appSize={appSize}
            allRatings={allRatings}
            gameCardProperties={{
              showMoreButton: true,
            }}
          />
        </ListLoader>
      </div>
    </div>
  );
};

GameSuggestionsBlockComponent.propTypes = componentPropertyTypes;
GameSuggestionsBlockComponent.defaultProps = componentDefaultProperties;

const GameSuggestionsBlock = hoc(GameSuggestionsBlockComponent);

export default GameSuggestionsBlock;
