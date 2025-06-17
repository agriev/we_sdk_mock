import { push } from 'react-router-redux';

import get from 'lodash/get';

import len from 'tools/array/len';

import paths from 'config/paths';

const keydownHandler = ({
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
}) => {
  if (!sectionName) {
    return;
  }

  const sectionResults = section.results;
  const maxPreviousResults = isGame(previousSectionName) ? 7 : 2;
  const result = sectionResults[currentSelection];

  return (event) => {
    const maxResult = Math.min(maxResults, len(sectionResults));
    const maxPreviousResult = Math.min(maxPreviousResults, len(get(previousSection, 'results', [])));

    switch (event.keyCode) {
      // Up
      case 38: {
        event.preventDefault();

        if (currentSection > 0 && currentSelection === 0) {
          setSelection({
            currentSection: currentSection - 1,
            currentSelection: maxPreviousResult - 1,
          });
        } else if (currentSelection > -1) {
          setSelection({
            currentSection,
            currentSelection: currentSelection - 1,
          });
        }
        break;
      }

      // Down
      case 40: {
        event.preventDefault();

        if (currentSection + 1 < len(sections) && currentSelection + 1 >= maxResult) {
          setSelection({
            currentSection: currentSection + 1,
            currentSelection: 0,
          });
        } else if (currentSelection + 1 < maxResult) {
          setSelection({
            currentSection,
            currentSelection: currentSelection + 1,
          });
        }
        break;
      }

      // Enter
      case 13: {
        event.preventDefault();

        // eslint-disable-next-line no-lonely-if
        if (currentSelection >= 0) {
          dispatch(
            push({
              pathname: paths.searchResult(sectionName, sectionResults[currentSelection].slug),
              state: isGame(sectionName) || isLibrary(sectionName) ? result : undefined,
            }),
          );
        } else {
          dispatch(push(paths.search(searchValue)));
        }
        break;
      }

      // Esc
      case 27:
        handleClose();
        break;

      default:
        break;
    }
  };
};

export default keydownHandler;
