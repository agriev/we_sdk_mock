/* eslint-disable import/prefer-default-export */

import config from '../../../config/config';

export const getStylesPrefetches = (styles) =>
  styles.map((source) => `<link rel="preload" href="${config.assetsPath}${source}" as="style">`).join('');

export const getJsPrefetches = (scripts) =>
  scripts
    .map(
      (source) =>
        `<link rel="preload" href="${config.assetsPath}${source}" as="script"><link rel="prefetch" href="${config.assetsPath}${source}">`,
    )
    .join('');

export const getJSInits = (scripts) => `
    <script>
      (function() {
        var scripts = [${scripts.map((source) => `'${source}'`).join(',')}];
        var addScript = function(src) {
          var script = document.createElement("script");
          script.setAttribute('type', 'text/javascript');
          script.setAttribute('src', '${config.assetsPath}' + src);
          document.body.appendChild(script);
        }
        setTimeout(function() {
          for (var idx in scripts) {
            addScript(scripts[idx]);
          }
        }, 100);
      })();
    </script>
  `;
