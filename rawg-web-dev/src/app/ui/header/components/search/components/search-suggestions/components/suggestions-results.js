import React, { useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, withRouter } from 'react-router';
import { compose } from 'recompose';

import toPairs from 'lodash/toPairs';

import reject from 'ramda/src/reject';

import SearchResults from 'app/ui/search-results/search-results';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import { appSizeType } from 'app/pages/app/app.types';

import { getViewAllResultsLink } from '../search-suggestions.lib';

import scrollContoller from './suggestions-results.scroll-contoller';
import keydownHandler from './suggestions-results.keydown-handler';

const hoc = compose(withRouter);

const propTypes = {
  searchValue: PropTypes.string,
  handleClose: PropTypes.func.isRequired,
  size: appSizeType.isRequired,
  dispatch: PropTypes.func.isRequired,
  suggestions: PropTypes.shape({}).isRequired,
  suggestionsCount: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const defaultProps = {
  searchValue: undefined,
};

const SuggestionsResults = ({
  suggestions,
  searchValue,
  size,
  dispatch,
  allRatings,
  handleClose,
  suggestionsCount,
  width,
}) => {
  const sections = reject(([, data]) => data.count === 0, toPairs(suggestions));
  const [{ currentSection, currentSelection }, setSelection] = useState({
    currentSection: 0,
    currentSelection: -1,
  });
  const [sectionName, section] = sections[currentSection] || [];
  const [previousSectionName, previousSection] = sections[currentSection - 1] || [];
  const isGame = (name) => name === 'games';
  const isLibrary = (name) => name === 'library';
  const maxResults = isGame(sectionName) ? 7 : 2;

  const handleKeyDown = useCallback(
    keydownHandler({
      dispatch,
      maxResults,
      sections,
      section,
      sectionName,
      currentSection,
      currentSelection,
      setSelection,
      previousSectionName,
      previousSection,
      isGame,
      isLibrary,
      searchValue,
      handleClose,
    }),
    [currentSelection, currentSection, searchValue],
  );

  useEffect(() => {
    if (sectionName) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleKeyDown, sectionName]);

  useEffect(scrollContoller(), [currentSelection, currentSection]);

  return (
    <div className="header__search__suggestions__results" style={{ width: `${width}px` }}>
      {sections.map(([name, data]) => {
        if (!data.count) {
          return null;
        }

        const sliceSize = name === 'games' ? 7 : 2;
        const results = data.results.slice(0, sliceSize);

        return (
          <div className="header__search__suggestions__section" key={name}>
            <div className="header__search__suggestions__section__title">
              <span className="header__search__suggestions__section__title_info">
                <SimpleIntlMessage id={`search.tab_${name}`} />
                <span className="header__search__suggestions__section__title_count">{data.count}</span>
              </span>
              {/* <Link
                className="header__search__suggestions__section__see-all"
                to={getSearchLink(searchValue, name)}
              >
                <SimpleIntlMessage id="search.see_all" />
              </Link> */}
            </div>
            <SearchResults
              tab={name}
              results={results}
              maxResults={maxResults}
              count={data.count}
              size={size}
              query={searchValue}
              inputValue={searchValue}
              dispatch={dispatch}
              allRatings={allRatings}
              closeSearch={handleClose}
              gameSize="small"
              currentSelection={sectionName === name ? currentSelection : undefined}
              disbableKeydownHandlers
            />
          </div>
        );
      })}
      <div className="header__search__suggestions__footer">
        <Link className="header__search__suggestions__section__see-all" to={getViewAllResultsLink(searchValue)}>
          <SimpleIntlMessage id="search.see_all_results" />
        </Link>
        {suggestionsCount}
      </div>
      <button onClick={handleClose} type="button" className="header__search-suggestions__close-button">
        <span className="header__search__close-button_icon" />
      </button>
    </div>
  );
};

SuggestionsResults.propTypes = propTypes;
SuggestionsResults.defaultProps = defaultProps;

export default hoc(SuggestionsResults);
