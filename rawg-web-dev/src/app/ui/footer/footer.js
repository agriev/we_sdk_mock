import React from 'react';

import { Link } from 'app/components/link';
import getCurrentYear from 'tools/dates/current-year';

import './footer.styl';

const Footer = () => {
  const links = {
    '/agreement': 'Пользовательское соглашение',
    '/privacy': 'Политика конфиденциальности',
    '/licence-users': 'Лицензионное соглашение',
    '/feedback': 'Обратная связь',
  };

  return (
    <footer className="footer">
      <div className="footer__top">
        <nav className="footer__nav">
          {Object.keys(links).map((to) => {
            const isAnchor = to.startsWith('http');
            const Component = isAnchor ? 'a' : Link;

            const props = {
              className: 'footer__link',
            };

            if (isAnchor) {
              props.href = to;
              props.target = '_blank';
              props.rel = 'noopener noreferer nofollow';
            } else {
              props.to = to;
            }

            return (
              <Component key={to} {...props}>
                {links[to]}
              </Component>
            );
          })}
        </nav>

        <span className="footer__copyright">1998-{getCurrentYear()} © AG.ru</span>
        <div className="footer__age">18+</div>
      </div>

      <div className="footer__text">
        Данные из Steam, PSN, Xbox Live, App Store, Google Play, GOG, Википедии, YouTube, Twitch, Reddit и Imgur.
      </div>

      <div className="footer__age">18+</div>
    </footer>
  );
};

export default Footer;
