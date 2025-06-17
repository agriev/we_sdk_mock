import React from 'react';

const linkAsIs = (url) => (
  <a href={url} target="_blank" rel="noopener noreferrer">
    {url}
  </a>
);

// prettier-ignore
export const blockLatestUpdates = (
  <div id="updates" className="apidocs-updates">
    <h2 className="apidocs-updates__title apidocs-h2">Latest updates</h2>
    <ul className="apidocs-updates__list">
      <li className="apidocs-updates__update apidocs-lead">
        ESRB-ratings added to list endpoints for easier filtering based on age rating.
      </li>
      <li className="apidocs-updates__update apidocs-lead">
        Metacritic can be used as a filtering and sorting option.
        Filter: {linkAsIs('https://api.rawg.io/api/games?metacritic=80,100')}.
        Sort: {linkAsIs('https://api.rawg.io/api/games?ordering=-metacritic')}.
      </li>
      <li className="apidocs-updates__update apidocs-lead">
        Non-fuzzy search option. To turn off
        fuzziness: {linkAsIs('https://api.rawg.io/api/games?search=303%20squadron&search_precise=true')}.
        To search by exact
        term: {linkAsIs('https://api.rawg.io/api/games?search=303%20squadron&search_exact=true')}.
      </li>
      <li className="apidocs-updates__update apidocs-lead">
        API key-based requests signing.
        The old method of signing with User Agent string will be slowly deprecated.
      </li>
      <li className="apidocs-updates__update apidocs-lead">
        Last update date added to game details endpoint.
        Useful to know if there is any new info to grab.
      </li>
      <li className="apidocs-updates__update apidocs-lead">
        System requirements added to game details endpoint.
      </li>
      <li className="apidocs-updates__update apidocs-lead">
        Separate Metacritic ratings for each game platform.
      </li>
    </ul>
  </div>
);
