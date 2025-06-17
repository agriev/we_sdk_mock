import React from 'react';

import prepare from 'tools/hocs/prepare';

import Page from 'app/ui/page';
import GameAccountsVerificationShared from 'app/components/game-accounts-verification';

const GameAccountsVerification = () => (
  <Page className="page_secondary" art={{ secondary: true }}>
    <GameAccountsVerificationShared separatedPageMode />
  </Page>
);

export default prepare()(GameAccountsVerification);
