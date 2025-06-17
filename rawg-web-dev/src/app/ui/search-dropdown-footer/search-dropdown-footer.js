import React from 'react';
import PropTypes from 'prop-types';
import { injectIntl, FormattedMessage, FormattedPlural } from 'react-intl';
import SVGInline from 'react-svg-inline';

import arrowRightIcon from 'assets/icons/arrow-right.svg';
import './search-dropdown-footer.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  count: PropTypes.number,
  maxResults: PropTypes.number,
  query: PropTypes.string,
  currentTab: PropTypes.string,
};

const defaultProps = {
  className: '',
  count: 0,
  maxResults: 5,
  query: '',
  currentTab: 'games',
};

const SearchDropdownFooter = ({ className, count, maxResults, query, currentTab }) => {
  return (
    <div className={['search-dropdown-footer', className].join(' ')}>
      <div className="search-dropdown-footer__results-count">
        {count > 0 ? (
          <FormattedPlural
            value={count}
            one={<FormattedMessage id={`search.${currentTab}.one`} values={{ count }} />}
            other={<FormattedMessage id={`search.${currentTab}`} values={{ count }} />}
          />
        ) : (
          <div className="search-dropdown-footer__no-results">
            {currentTab === 'library' ? (
              <FormattedMessage id="search.zero" values={{ currentTab: 'games' }} />
            ) : (
              <FormattedMessage id="search.zero" values={{ currentTab }} />
            )}
          </div>
        )}
      </div>
      <a
        href={`/search?query=${encodeURIComponent(query)}&tab=${currentTab}`}
        className="search-dropdown-footer__view-all"
      >
        {count > maxResults && (
          <span>
            <FormattedMessage id="game.view_all" />
            <SVGInline svg={arrowRightIcon} />
          </span>
        )}
      </a>
    </div>
  );
};

SearchDropdownFooter.propTypes = componentPropertyTypes;

SearchDropdownFooter.defaultProps = defaultProps;

const injectedIntlSearchDropdownFooter = injectIntl(SearchDropdownFooter);
export default injectedIntlSearchDropdownFooter;
