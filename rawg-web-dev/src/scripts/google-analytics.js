const googleAnalyticsScript = (embedded, locale) => {
  if (embedded) {
    return `
      window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
      ga('create', 'UA-96321787-3', 'auto');
    `;
  }

  if (locale === 'ru') {
    return `
      window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
      ga('create', 'UA-309899-4', 'auto');
      ga('send', 'pageview');
    `;
  }

  return `
    window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
    ga('create', 'UA-96321787-1', 'auto');
    ga('send', 'pageview');
  `;
};

export default googleAnalyticsScript;
