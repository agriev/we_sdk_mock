import React from 'react';
import { FormattedMessage } from 'react-intl';

import toString from 'lodash/toString';
import get from 'lodash/get';
import toFinite from 'lodash/toFinite';
import isArray from 'lodash/isArray';

import append from 'ramda/src/append';
import pipe from 'ramda/src/pipe';
import evolve from 'ramda/src/evolve';
import keys from 'ramda/src/keys';
import reverse from 'ramda/src/reverse';

import addKeyIfNotExists from 'tools/ramda/add-key-if-not-exists';
import getCurrentYear from 'tools/dates/current-year';
import len from 'tools/array/len';

import Heading from 'app/ui/heading';

const getYearTitle = (year) => {
  if (toString(getCurrentYear()) === year) {
    return <FormattedMessage id="discover.current_year" />;
  }

  if (toFinite(year) > 0) {
    return year;
  }

  return <FormattedMessage id="discover.unknown_release_date" />;
};

export const groupByYears = (games) => {
  const unknownYearGames = [];

  const years = games.reduce((groups, game) => {
    const releasedDate = game.released || get(game, 'props.game.released');
    const year = releasedDate ? new Date(releasedDate).getFullYear() : 'unknown';

    if (year === 'unknown') {
      unknownYearGames.push(game);

      return groups;
    }

    return pipe(addKeyIfNotExists(year, []), evolve({ [year]: append(game) }))(groups);
  }, {});

  const renderYear = (year, items) => ({
    key: year,
    items: isArray(items) ? items : years[year],
    title: (
      <Heading className="discover-games-list__heading" rank={3}>
        {getYearTitle(year)}
      </Heading>
    ),
  });

  const results = reverse(keys(years)).map(renderYear);

  if (len(unknownYearGames) > 0) {
    return [...results, renderYear('unknown', unknownYearGames)];
  }
  return results;
};
