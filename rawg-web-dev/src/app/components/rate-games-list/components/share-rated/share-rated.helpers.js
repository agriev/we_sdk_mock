import memoizeOne from 'memoize-one';

import groupBy from 'lodash/groupBy';

import sortBy from 'ramda/src/sortBy';
import reverse from 'ramda/src/reverse';
import pipe from 'ramda/src/pipe';
import uniqBy from 'ramda/src/uniqBy';
import prop from 'ramda/src/prop';
import map from 'ramda/src/map';

import crop from 'tools/img/crop';
import getPreviousYear from 'tools/dates/previous-year';

import { isPositive } from 'app/components/rate-games-list/rate-games-list.helpers';

const dateUnix = (game) => new Date(game.date).getTime() / 1000;

const correctSort = pipe(
  sortBy((game) => `${game.rating}.${dateUnix(game)}`),
  reverse,
  uniqBy(prop('id')),
);

const isolateLastYearGames = (games) =>
  groupBy(games, (game) => {
    const isLast = new Date(game.released).getFullYear() === getPreviousYear();

    return isLast ? 'last' : 'other';
  });

export const getRatedGroups = ({ currentUser, allGames, ratedGames }) => {
  const positivelyRated = correctSort(
    ratedGames.reduce((array, gameRate) => {
      if (isPositive(gameRate)) {
        if (!currentUser.id) {
          const game = allGames.results.find((gm) => gm.id === gameRate.id);
          if (game) {
            return [
              ...array,
              {
                ...game,
                rating: gameRate.rating,
                date: gameRate.date,
              },
            ];
          }
        }

        return [...array, gameRate];
      }

      return array;
    }, []),
  );

  const { last = [], other = [] } = isolateLastYearGames(positivelyRated);

  if (last.length >= 2) {
    return [
      {
        title: 'My top 2018 games',
        games: last.slice(0, 5),
      },
      {
        title: 'Highest rated games from my library',
        games: [...last.slice(5), ...other.slice(0, 10)].slice(0, 10 - Math.min(last.length, 5)),
      },
    ];
  }

  return [
    {
      title: 'Highest rated games from my library',
      games: positivelyRated.slice(0, 10),
    },
  ];
};

export const getBackgroundImage = memoizeOne((url) => {
  if (url) {
    return {
      backgroundImage: `url('${crop(96, url)}')`,
    };
  }

  return undefined;
});

const linearGradient = 'linear-gradient(to bottom, rgba(0, 0, 0, 0.6), #101010 250px)';

export const getCoverStyle = memoizeOne(({ firstGame, currentUser }) => {
  if (currentUser.id) {
    //
  }

  if (!firstGame) {
    return undefined;
  }

  const backgroundImage = firstGame.background_image;

  if (backgroundImage) {
    return {
      background: `${linearGradient}, url('${backgroundImage}')`,
    };
  }

  return undefined;
});

export const calcRatedGames = ({ exceptional, recommended }) => {
  const makeRatedGames = pipe(
    prop('results'),
    map((review) => ({
      ...review,
      ...review.game,
      date: review.edited,
    })),
  );

  return [...makeRatedGames(exceptional), ...makeRatedGames(recommended)];
};
