export const setPage = (pageNumber) => {
  try {
    if (typeof window === 'object') {
      const url = new URL(window.location.href);
      const currentPageNumber = url.searchParams.get('page');
      if (pageNumber > 1 && currentPageNumber !== pageNumber) {
        url.searchParams.set('page', pageNumber);
        window.history.pushState({ page: pageNumber }, null, url.href);
      }
    }
  } catch (error) {
    console.error(error);
  }
};
