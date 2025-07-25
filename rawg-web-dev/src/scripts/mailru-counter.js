const code = `
<!-- Rating Mail.ru counter -->
<script type="text/javascript">
  var _tmr = window._tmr || (window._tmr = []);
  _tmr.push({id: "15162", type: "pageView", start: (new Date()).getTime()});
  (function (d, w, id) {
    if (d.getElementById(id)) return;
    var ts = d.createElement("script"); ts.type = "text/javascript"; ts.async = true; ts.id = id;
    ts.src = "https://top-fwz1.mail.ru/js/code.js";
    var f = function () {var s = d.getElementsByTagName("script")[0]; s.parentNode.insertBefore(ts, s);};
    if (w.opera == "[object Opera]") { d.addEventListener("DOMContentLoaded", f, false); } else { f(); }
  })(document, window, "topmailru-code");
</script>
<noscript>
  <div>
    <img src="https://top-fwz1.mail.ru/counter?id=15162;js=na" style="border:0;position:absolute;left:-9999px;" alt="Top.Mail.Ru" />
  </div>
</noscript>
<!-- //Rating Mail.ru counter -->
`;

const mailRuCounterInitCode = (locale) => {
  if (locale === 'ru') {
    return code;
  }

  return '';
};

export default mailRuCounterInitCode;
