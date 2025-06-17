// Оповещения, которые генерируются локально
// клиентом через его собственную клиентскую логику
export const LOCAL_NOTIFICATION = 'local-notification';
export const LOCAL_IMPORT_PROGRESS_ID = `${LOCAL_NOTIFICATION}-import-progress`;
export const LOCAL_PROFILE_SAVED_ID = `${LOCAL_NOTIFICATION}-profile-saved`;
export const LOCAL_PASSWORD_UPDATED_ID = `${LOCAL_NOTIFICATION}-password-updated`;
export const LOCAL_EMAIL_CHANGED_ID = `${LOCAL_NOTIFICATION}-email-changed`;
export const LOCAL_RATEGAMES_WELCOME = `${LOCAL_NOTIFICATION}-rategames-welcome`;

export const LOCAL_TOKENS_JOIN_ERROR = `${LOCAL_NOTIFICATION}-tokens-join-error`;
export const LOCAL_TOKENS_JOIN_SUCCESS = `${LOCAL_NOTIFICATION}-tokens-join-success`;
export const LOCAL_TOKENS_SENT = `${LOCAL_NOTIFICATION}-tokens-sent`;
export const LOCAL_TOKENS_REMIND_SUBSCRIBED = `${LOCAL_NOTIFICATION}-tokens-remind-subscribed`;

export const LOCAL_GAME_EDIT_UPLOAD_SCREENSHOT_SUCCESS = `${LOCAL_NOTIFICATION}-game-edit__upload-screenshot-success`;
export const LOCAL_GAME_EDIT_UPLOAD_SCREENSHOT_ERROR = `${LOCAL_NOTIFICATION}-game-edit__upload-screenshot-error`;
export const LOCAL_GAME__EDIT_UPDATE_SUCCESS = `${LOCAL_NOTIFICATION}-game-edit__update-data-success`;
export const LOCAL_GAME__EDIT_UPDATE_FAIL = `${LOCAL_NOTIFICATION}-game-edit__update-data-failed`;
export const LOCAL_GAME_EDIT_STORE_NOT_FOUND = `${LOCAL_NOTIFICATION}-game-edit__store-not-found`;

// Оповещения, которые получает Pusher с бекенда
export const PUSHER_EMAIL_CONFIRM_ID = 'email-confirm';
export const PUSHER_IMPORT_COMPLETED_ID = 'import';
export const PUSHER_IMPORT_WAITING_ID = 'import-waiting';
export const PUSHER_FEEDBACK_ID = 'feedback-propose';

export const FIXED_NOTIFY_WAIT_TIME_MS = 3000;
