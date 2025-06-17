/* global document */

import scriptText from './newrelic/production';

export default function addNewrelicProduction() {
  const template = document.createElement('template');
  template.innerHTML = `<script type="text/javascript">${scriptText}</script`;
  template.content.childNodes.forEach((element) => {
    if (element instanceof window.HTMLElement || element instanceof window.Comment) {
      window.document.body.appendChild(element);
    }
  });
}
