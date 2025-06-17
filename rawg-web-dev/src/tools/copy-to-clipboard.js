/**
 * Источник кода: https://gist.github.com/lgarron/d1dee380f4ed9d825ca7
 * @param {string} text
 */
function copyTextToClipboard(text) {
  const windowDocument = window.document;

  function listener(e) {
    e.clipboardData.setData('text/plain', text);
    e.preventDefault();
  }

  windowDocument.addEventListener('copy', listener);
  windowDocument.execCommand('copy');
  windowDocument.removeEventListener('copy', listener);
}

export default copyTextToClipboard;
