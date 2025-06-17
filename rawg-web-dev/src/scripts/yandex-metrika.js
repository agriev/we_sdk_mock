export const getYMetrikaId = (embedded, locale) => {
  // if (embedded) {
  //   return 53564935;
  // }

  // if (locale === 'ru') {
  //   return 19893820;
  // }

  // return 45928035;
  return 19893820;
};

const yandexMetrikaScript = (embedded, locale) => {
  const id = getYMetrikaId(embedded, locale);

  return `
  (function (d, w, c) {
    (w[c] = w[c] || []).push(function() {
        try {
            w.yaCounter = new Ya.Metrika({
                id:${id},
                clickmap:true,
                trackLinks:true,
                accurateTrackBounce:true,
                webvisor:true
            });
        } catch(e) { }
    });

    var n = d.getElementsByTagName("script")[0],
        s = d.createElement("script"),
        f = function () { n.parentNode.insertBefore(s, n); };
    s.type = "text/javascript";
    s.async = true;
    s.src = "https://mc.yandex.ru/metrika/watch.js";

    if (w.opera == "[object Opera]") {
        d.addEventListener("DOMContentLoaded", f, false);
    } else { f(); }
  })(document, window, "yandex_metrika_callbacks");
  `;
};

export default yandexMetrikaScript;
