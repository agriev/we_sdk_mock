export const dispatchCustomEvent = ({ el, eventName, detail }) => {
  if (typeof CustomEvent === 'function') {
    const event = new CustomEvent(eventName, { detail });
    el.dispatchEvent(event);
  }
};
