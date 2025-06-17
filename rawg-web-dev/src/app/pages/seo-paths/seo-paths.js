import React from 'react';
import { Link } from 'app/components/link';

import paths from 'config/paths';

import './seo-paths.styl';

const Paths = () => (
  <div className="paths">
    <Link to={paths.index}>Main</Link>
    <br />
    <Link to={paths.login} href={paths.login}>
      Login
    </Link>
    <br />
    <Link to={paths.register} href={paths.register}>
      Register
    </Link>
    <br />
    <Link to={paths.gameAccounts} href={paths.gameAccounts}>
      Game accounts
    </Link>
    <br />
    <Link to={paths.passwordRecovery} href={paths.passwordRecovery}>
      Password recovery
    </Link>
    <br />
    <Link to={paths.passwordReset} href={paths.passwordReset}>
      Password reset
    </Link>
    <br />
    <Link to={paths.feedback} href={paths.feedback}>
      Feedback
    </Link>
    <br />
    <Link to={paths.game(334)} href={paths.game(334)}>
      Game
    </Link>
    <br />
    <Link to={paths.settings} href={paths.settings}>
      Settings
    </Link>
    <br />
    <Link to={paths.profile(1)} href={paths.profile(1)}>
      Profile
    </Link>
    <br />
    <Link to={paths.collection(3)} href={paths.collection(3)}>
      Collection
    </Link>
    <br />
    <Link to={paths.search()} href={paths.search()}>
      Search
    </Link>
    <br />
    <Link to={paths.privacyPolicy} href={paths.privacyPolicy}>
      Privacy policy
    </Link>
    <br />
    <Link to={paths.terms} href={paths.terms}>
      Terms
    </Link>
  </div>
);

export default Paths;
