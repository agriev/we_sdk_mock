import cond from 'ramda/src/cond';
import equals from 'ramda/src/equals';
import always from 'ramda/src/always';
import socialAuthConfig from 'ssr/server/social-auth/social-auth.config';

const getFacebookLocale = cond([[equals('en'), always('en_US')], [equals('ru'), always('ru_RU')]]);

const facebookSDKInitCode = (locale) => `
<div id="fb-root"></div>
<script>
(function(d, s, id) {
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s); js.id = id;
  js.src = 'https://connect.facebook.net/${getFacebookLocale(locale)}/sdk.js#xfbml=1&version=v3.2&appId=${
  socialAuthConfig.facebook[locale].clientID
}';
  fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));
</script>
`;

export default facebookSDKInitCode;
