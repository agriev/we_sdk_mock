import { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';

import path from 'ramda/src/path';

import getScrollTop from 'tools/get-scroll-top';
import getScrollContainer from 'tools/get-scroll-container';

/**
 * Специальный компонент, который создан в SEO целях.
 * Он отображает контент ровно до того момента, пока пользователь не сделает
 * первый скролл. После скролла пользователя контент удаляется. Таким образом
 * боты, которые не пользуются сроллом, увидят данный котент, а
 * пользователи - (скорее всего) нет.
 */
const HideOnScroll = ({ children }) => {
  const [isActive, setIsActive] = useState(true);

  const callbacks = {};

  const firstPage = useSelector(path(['app', 'firstPage']));

  callbacks.removeScrollListener = useCallback(() => {
    getScrollContainer().removeEventListener('scroll', callbacks.onScroll);
  }, []);

  callbacks.onScroll = useCallback(() => {
    if (getScrollTop() > 0 && isActive === true) {
      setIsActive(false);
      callbacks.removeScrollListener();
    }
  }, []);

  useEffect(() => {
    getScrollContainer().addEventListener('scroll', callbacks.onScroll);

    return () => {
      callbacks.removeScrollListener();
    };
  }, []);

  return firstPage && children(isActive);
};

export default HideOnScroll;
