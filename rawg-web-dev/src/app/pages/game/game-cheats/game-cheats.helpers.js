/* eslint-disable import/prefer-default-export */

import cond from 'ramda/src/cond';
import propEq from 'ramda/src/propEq';
import lte from 'ramda/src/lte';
import ifElse from 'ramda/src/ifElse';
import propSatisfies from 'ramda/src/propSatisfies';
import assoc from 'ramda/src/assoc';
import pipe from 'ramda/src/pipe';
import T from 'ramda/src/T';

const addIdx = ifElse(
  propSatisfies(lte(1), 'idx'),
  ({ idx, title, intl }) => `${intl.formatMessage({ id: title })} #${idx + 1}`,
  ({ title, intl }) => intl.formatMessage({ id: title }),
);

export const cheatsTypeItemTitle = pipe(
  cond([
    [propEq('type', 'code'), assoc('title', 'game.cheats_code_item_title')],
    [propEq('type', 'easter'), assoc('title', 'game.cheats_easter_item_title')],
    [propEq('type', 'faq'), assoc('title', 'game.cheats_faq_item_title')],
    [propEq('type', 'hints'), assoc('title', 'game.cheats_hint_item_title')],
    [propEq('type', 'hex'), assoc('title', 'game.cheats_hex_item_title')],
    [propEq('type', 'sol'), assoc('title', 'game.cheats_sol_item_title')],
    [propEq('type', 'edit'), assoc('title', 'game.cheats_edit_item_title')],
    [propEq('type', 'ghack'), assoc('title', 'game.cheats_ghack_item_title')],
    [propEq('type', 'gwiz'), assoc('title', 'game.cheats_gwiz_item_title')],
    [propEq('type', 'mtc'), assoc('title', 'game.cheats_mtc_item_title')],
    [propEq('type', 'save'), assoc('title', 'game.cheats_save_item_title')],
    [propEq('type', 'train'), assoc('title', 'game.cheats_train_item_title')],
    [propEq('type', 'uge'), assoc('title', 'game.cheats_uge_item_title')],
    [propEq('type', 'uhs'), assoc('title', 'game.cheats_uhs_item_title')],
    [propEq('type', 'msc'), assoc('title', 'game.cheats_msc_item_title')],
    [propEq('type', 'amtab'), assoc('title', 'game.cheats_amtab_item_title')],
    [propEq('type', 'sol_pack'), assoc('title', 'game.cheats_sol_pack_item_title')],
    [propEq('type', 'sol_pak'), assoc('title', 'game.cheats_sol_pack_item_title')],
    [propEq('type', 'ach'), assoc('title', 'game.cheats_ach_item_title')],
    [propEq('type', 'faq_pak'), assoc('title', 'game.cheats_faq_pack_item_title')],
    [T, assoc('title', 'game.cheats_other_item_title')],
  ]),
  addIdx,
);
