const gplay = require('google-play-scraper');
const args = process.argv.slice(2);

function output(data) {
    console.log(JSON.stringify(data));
}

function handle_not_found() {
    console.log([]);
}

gplay.developer({devId: args[0], lang: args[1], country: args[2], fullDetail: true}).then(output, handle_not_found);
