import React from 'react';

import prepare from 'tools/hocs/prepare';

import Page from 'app/ui/page';
import GameAccountsShared from 'app/components/game-accounts';

const GameAccounts = () => (
  <Page className="page_secondary" art={{ secondary: true }}>
    <GameAccountsShared separatedPageMode />
  </Page>
);

export default prepare()(GameAccounts);
