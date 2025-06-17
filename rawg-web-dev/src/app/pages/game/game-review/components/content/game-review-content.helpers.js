/* eslint-disable import/prefer-default-export */

import React from 'react';
import HTML from 'html-parse-stringify';

import pipe from 'ramda/src/pipe';
import insert from 'ramda/src/insert';

import ReviewScreenshots from '../screenshots';

const findPar = (document_, parN) => {
  let meetedPars = 0;

  return document_.findIndex((element) => {
    if (element.name === 'p') {
      meetedPars += 1;

      if (meetedPars === parN) {
        return true;
      }
    }

    return false;
  });
};

const addScreenshotsBlock = ({ document_, game, isDesktop }) => {
  const secondPar = findPar(document_, 2);

  if (secondPar) {
    return insert(
      secondPar + 1,
      {
        type: 'component',
        component: <ReviewScreenshots isDesktop={isDesktop} key="screenshots" game={game} />,
      },
      document_,
    );
  }

  return document_;
};

const processDocument = pipe(addScreenshotsBlock);

export const getReviewAst = ({ html, game, isDesktop }) => {
  const document_ = HTML.parse(html);

  return processDocument({ document_, game, isDesktop });
};
