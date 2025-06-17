// Пытается взять текущий урл из текущего документа или родительского значения айфрейма
const getCurrentUrl = () => {
  try {
    if (window.location !== window.parent.location) {
      return document.referrer;
    }

    return document.location.href;
  } catch (error) {
    return document.location.href;
  }
};

export default getCurrentUrl;
