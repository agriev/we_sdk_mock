import sanitizeHTML from 'sanitize-html';

export default function clearPastedData(string, additionalParams) {
  return sanitizeHTML(string, {
    allowedTags: ['div', 'br', 'a', 'span', 'img', 'iframe', 'embed'],
    allowedClasses: {
      div: ['editor__loader', 'editor__loader-icon', 'editor__insertion', 'editor__iframe-wrapper'],
      iframe: ['editor__iframe'],
    },
    allowedAttributes: {
      '*': ['id', 'class', 'src', 'width', 'height', 'sandbox', 'allowfullscreen'],
    },
    ...additionalParams,
  });
}
