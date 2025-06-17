// Супер-костыль для отлова ошибок в fetch as google
// https://blog.codaxy.com/debugging-googlebot-crawl-errors-for-javascript-applications-5d9134c06ee7
export default `
window.onerror = function (message, url, lineNo, colNo, error) {

  console.log(arguments);

  var container = document.createElement('div');

  container.style.color = 'red';
  container.style.position = 'fixed';
  container.style.background = '#eee';
  container.style.padding = '2em';
  container.style.top = '1em';
  container.style.left = '1em';

  var msg = document.createElement('pre');
  msg.innerText = [
     'Message: ' + message,
     'URL: ' + url,
     'Line: ' + lineNo,
     'Column: ' + colNo,
     'Stack: ' + (error && error.stack)
  ].join('\\n');

  container.appendChild(msg);

  document.body.appendChild(container);
};
`;
