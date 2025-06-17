import getAppContainerWidth from 'tools/get-app-container-width';

const isClient = () => typeof window !== 'undefined';

const breakpoints = [980, 1050, 1120, 1190, 1260, 1330, 1400];

const getVisibleSectionsCount = ({ showMyGamesBadge, userLogged }) => {
  const defaultValue = 1;

  if (!isClient()) return defaultValue;

  let width = getAppContainerWidth();
  let count = 0;

  if (showMyGamesBadge) {
    width -= 150;
  }

  if (!userLogged) {
    width -= 100;
  }

  const showAll = breakpoints.every((point) => {
    if (point < width) {
      count += 1;

      return true;
    }

    return false;
  });

  if (showAll) {
    return 99;
  }

  return count;
};

export default getVisibleSectionsCount;
