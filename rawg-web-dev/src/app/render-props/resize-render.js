import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

import throttle from 'lodash/throttle';

import getAppContainerWidth from 'tools/get-app-container-width';
import getAppContainerHeight from 'tools/get-app-container-height';

const propTypes = {
  children: PropTypes.func.isRequired,
  enableWidth: PropTypes.bool,
  enableHeight: PropTypes.bool,
};

const defaultProps = {
  enableWidth: true,
  enableHeight: false,
};

const ResizeRender = ({ children, enableWidth, enableHeight }) => {
  const [width, setWidth] = useState(getAppContainerWidth());
  const [height, setHeight] = useState(getAppContainerHeight());

  const onResize = useCallback(
    throttle(() => {
      const newWidth = getAppContainerWidth();
      const newHeight = getAppContainerHeight();

      if (enableWidth && newWidth !== width) {
        setWidth(newWidth);
      }

      if (enableHeight && newHeight !== height) {
        setHeight(newHeight);
      }
    }, 300),
    [],
  );

  useEffect(() => {
    window.addEventListener('resize', onResize);

    onResize();

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const props = {};

  if (enableWidth) {
    props.width = width;
  }
  if (enableHeight) {
    props.height = height;
  }

  return children(props);
};

ResizeRender.propTypes = propTypes;

ResizeRender.defaultProps = defaultProps;

export default ResizeRender;
