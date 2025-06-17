import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import './banner-adfox.styl';
import { ADFOX_CODES } from 'scripts/adfox';
import { isFlutter } from 'tools/is-flutter';
// import { appSizeType, appLocaleType } from 'app/pages/app/app.types';

// import { bannersDisabled } from 'app/pages/app/components/banners/app.banners';

const propTypes = {
  // appSize: appSizeType.isRequired,
  // appLocale: appLocaleType.isRequired,
  // currentPath: PropTypes.string.isRequired,

  appSize: PropTypes.string,

  onClose: PropTypes.func,
  onError: PropTypes.func,
  onLoad: PropTypes.func,
  onRender: PropTypes.func,
  onStub: PropTypes.func,

  type: PropTypes.oneOf(Object.keys(ADFOX_CODES)),
  inlineOptions: PropTypes.object,
};

const readyPromise = new Promise((resolve) => {
  if (typeof window === 'undefined') {
    return resolve(true);
  }

  if (isFlutter(navigator.userAgent)) {
    return resolve(true);
  }

  const interval = setInterval(() => {
    if (window.yaContextCb && window.Ya && window.Ya.adfoxCode) {
      resolve(true);
      return clearInterval(interval);
    }
  }, 100);
});

const BannerAdfox = ({ appSize = '', inlineOptions, onClose, onError, onLoad, onRender, onStub, type }) => {
  if (typeof navigator !== 'undefined' && isFlutter(navigator.userAgent)) {
    return null;
  }

  const [id, setId] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let adfox = ADFOX_CODES[type];

    if (typeof inlineOptions === 'object') {
      adfox = JSON.parse(JSON.stringify(inlineOptions));
    }

    if (!id) {
      const n = (Math.random() * 100000000).toFixed(0);

      if (adfox.variant === 'rtb' && adfox.params.renderTo) {
        setId(adfox.params.renderTo);
      } else {
        setId(`adfox_${n}_${appSize}`);
      }
    }

    readyPromise.then(() => {
      if (!adfox || !id) {
        return;
      }

      if (typeof navigator !== 'undefined' && isFlutter(navigator.userAgent)) {
        return null;
      }

      window.yaContextCb.push(() => {
        if (adfox.variant === 'rtb') {
          return window.Ya.Context.AdvManager.render(adfox.params);
        }

        window.Ya.adfoxCode.createAdaptive(
          {
            ownerId: 364531,
            containerId: id,
            params: adfox.params,

            onClose,
            onError,
            onLoad,
            onRender,
            onStub,

            ...adfox.custom,
          },

          adfox.devices,
          adfox.options,
        );
      });
    });

    return () => {
      readyPromise.then(() => {
        try {
          if (typeof navigator !== 'undefined' && isFlutter(navigator.userAgent)) {
            return null;
          }

          if (document.body.lastChild && document.body.lastChild.innerHTML.includes('adfox')) {
            document.body.lastChild.remove();
          }

          window.Ya.Context.AdvManager.destroy(id);
          window.Ya.adfoxCode.destroy(id);
        } catch {
          //
        }
      });
    };
  }, [id]);

  return <aside id={id} />;
};

export default BannerAdfox;
