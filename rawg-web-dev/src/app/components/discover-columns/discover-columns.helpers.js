import memoizeOne from 'memoize-one';

import chunk from 'lodash/chunk';

import transpose from 'ramda/src/transpose';
import cond from 'ramda/src/cond';
import lte from 'ramda/src/lte';
import gt from 'ramda/src/gt';

import getAppContainerWidth from 'tools/get-app-container-width';

const SIDEBAR_WIDTH = 220;
const getIndents = (width) => (width <= 1000 && width >= 979 ? 40 : 80);
const contentWidth = (width) => width - SIDEBAR_WIDTH - getIndents(width);

const layout = (columns, width) => ({ columns, width: contentWidth(width) });

const layouts = cond([
  [gt(1024), (width) => layout(2, width)],
  [gt(1440), (width) => layout(3, width)],
  [gt(1920), (width) => layout(4, width)],
  [lte(1920), (width) => layout(5, Math.min(1920, width))],
]);

export const calcDiscoveryLayout = (width) => layouts(width || getAppContainerWidth());

export const getContainerStyle = memoizeOne(({ columns, containerWidth, width }) => {
  let n = columns;

  if (width < 1024) {
    n = columns - 1;
  }

  return {
    gridTemplateColumns: `repeat(${n}, 1fr)`,
  };
});

export const getGroupedGames = (games, groupCount = 3) => transpose(chunk(games, groupCount));
