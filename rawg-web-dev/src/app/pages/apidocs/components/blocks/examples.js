import React from 'react';

import ApidocsAccordion from '../apidocs-accordion';

const examples = [
  {
    title: 'What console games were released last month?',
    opened: true,
    text: `GET https://api.rawg.io/api/platforms # get ids of target platforms
      GET https://api.rawg.io/api/games?dates=2019-09-01,2019-09-30&platforms=18,1,7 # insert platforms ids`,
  },
  {
    title: 'What are the most anticipated upcoming games?',
    text: 'GET https://api.rawg.io/api/games?dates=2019-10-10,2020-10-10&ordering=-added',
  },
  {
    title: 'What games were published by Annapurna Interactive in the 2019?',
    text: `GET https://api.rawg.io/api/developers?search=Annapurna%20Interactive&page_size=1 # get the developer id
      GET https://api.rawg.io/api/games?dates=2019-01-01,2019-12-31&developers=15 # insert developer id`,
  },
  {
    title: 'What are the most popular games in 2019?',
    text: 'GET https://api.rawg.io/api/games?dates=2019-01-01,2019-12-31&ordering=-added',
  },
  {
    title: 'What are the highest rated games from 2001?',
    text: 'GET https://api.rawg.io/api/games?dates=2001-01-01,2001-12-31&ordering=-rating',
  },
  {
    title: 'What is the highest rated game by Electronic Arts?',
    text: `GET https://api.rawg.io/api/developers?search=Electronic%20Arts&page_size=1 # get the developer id
      GET https://api.rawg.io/api/games?ordering=-rating&developers=109 # insert developer id`,
  },
];

// prettier-ignore
export const blockExamples = (
  <div id="use-cases" className="apidocs-examples">
    <h2 className="apidocs-examples__title apidocs-h2">Example usecases</h2>
    <p className="apidocs-examples__description apidocs-lead">
      RAWG API is a powerful tool for working with video games data.
      Below are a few examples of what you can do with the API.
    </p>
    <div className="apidocs-examples__list">
      {examples.map(({ title, text, opened = false }, index) => (
        <ApidocsAccordion title={title} text={text} key={index} opened={opened} />
      ))}
    </div>
  </div>
);
