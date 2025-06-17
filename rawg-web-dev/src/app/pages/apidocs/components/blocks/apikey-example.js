import React from 'react';

// prettier-ignore
export const blockApiKeyExample = (
  <div className="apidocs-apikey">
    <div className="apidocs-apikey__text">
      <h2 className="apidocs-apikey__title apidocs-h2">
        Adding the API key to your request
      </h2>
      <p className="apidocs-apikey__description apidocs-lead">
        You must include an API key with every request. In the following example, replace
        YOUR_API_KEY with your API key.
      </p>
    </div>
    <code className="apidocs-apikey__code">
      GET https://api.rawg.io/api/platforms?key=YOUR_API_KEY
      <br />
      GET https://api.rawg.io/api/games?key=YOUR_API_KEY&dates=2019-09-01,2019-09-30&platforms=18,1,7
    </code>
  </div>
);
