import React from 'react';
import PropTypes from 'prop-types';

// prettier-ignore
export const getBlockTerms = ({ rawgEmail }) => (
  <div id="terms" className="apidocs-terms">
    <h2 className="apidocs-terms__title apidocs-h2">
      <a href="/tos_api" target="_blank" rel="noopener noreferrer">Terms of Service</a>
    </h2>
    <div className="apidocs__content">
      <div className="apidocs-terms__list">
        <div className="apidocs-terms__term apidocs-lead">
          Free for personal use as long as you attribute RAWG as the source of the data
          and/or images and add an active hyperlink from every page where the data of RAWG
          is used.
        </div>
        <div className="apidocs-terms__term apidocs-lead">
          Free for commercial use for startups and hobby projects with not more than
          100,000 monthly active users or 500,000 page views per month. If your project is
          larger than that, email us at {rawgEmail} for commercial terms.
        </div>
        <div className="apidocs-terms__term apidocs-lead">
          No data redistribution. It would not be cool if you used our API to resell
          our data or make it available for other businesses.
          In other words, you may use the data with your API access only for your projects.
        </div>
        <div className="apidocs-terms__term apidocs-lead">
          API Legal Notice: We do not claim ownership of any of the images or data
          provided by the API. We remove infringing content when properly notified. Any
          data and/or images one might upload to RAWG is expressly granted a license to
          use. You are prohibited from using the images and/or data in connection with
          libelous, defamatory, obscene, pornographic, abusive or otherwise offensive
          content.
        </div>
        <div className="apidocs-terms__term apidocs-lead">
          If you have any questions about our API, we'd love to help.
          Email us at {rawgEmail} or ask the community at
          our <a href="https://discord.gg/erNybDp" target="_blank" rel="noopener noreferrer">Discord</a>.
        </div>
      </div>
    </div>
  </div>
);

getBlockTerms.propTypes = {
  rawgEmail: PropTypes.any.isRequired,
};
