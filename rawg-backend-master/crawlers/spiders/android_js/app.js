var gplay = require('google-play-scraper');
var args = process.argv.slice(2);

function output(data) {
    console.log(JSON.stringify(data));
}

function handle_not_found() {
    console.log([]);
}

gplay.app({appId: args[0], lang: args[1], country: args[2]}).then(output, handle_not_found);
