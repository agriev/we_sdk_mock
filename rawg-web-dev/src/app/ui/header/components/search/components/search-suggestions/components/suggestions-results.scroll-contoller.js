import getAppContainerHeight from 'tools/get-app-container-height';
import getScrollTop from 'tools/get-scroll-top';

const scrollContoller = () => {
  return () => {
    const selectedElement = document.documentElement.querySelector('.search-results__game-selected');

    if (selectedElement) {
      const currentScroll = getScrollTop();
      const currentWindowHeight = getAppContainerHeight();
      const elementTop = currentScroll + selectedElement.getBoundingClientRect().top;

      const bottomReached = elementTop > currentWindowHeight + currentScroll - 100;
      const topReached = currentScroll > elementTop - 50;

      if (bottomReached) {
        window.scrollTo(0, elementTop - currentWindowHeight + 200);
      }

      if (topReached) {
        window.scrollTo(0, elementTop - 100);
      }
    }
  };
};

export default scrollContoller;
