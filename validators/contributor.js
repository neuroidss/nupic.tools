var contribUtil = require('../utils/contributors'),
    log = require('../utils/logger').logger,
    NAME = 'Contributor Validator';

function isContributor(name, roster) {
    if (name == null || name == undefined) return false;
    if (name === false) return true; // explicit false means ignore
    return roster.map(function(p) { return p.Github; })
                 .reduce(function(prev, curr) {
                    if (prev) return prev;
                    return curr == name;
                 }, false);
}

function validator(sha, githubUser, githubClient, callback) {
    log.log('Validating contributor "' + githubUser + '"...');
    contribUtil.getAll(githubClient.contributorsUrl, function(err, contributors) {
        var response = {};
        // If there's an error, we'll handle it like a validation failure.
        if (err) {
            response.state = 'failure';
            response.description = 'Error running ' + NAME + ': ' + err;
        } else if (isContributor(githubUser, contributors)) {
            response.state = 'success';
            response.description = githubUser + ' has signed the Numenta Contributor License';
            response.target_url = 'http://numenta.org/contributors/';
        } else {
            response.state = 'failure';
            response.description = githubUser + ' must sign the Numenta Contributor License';
            response.target_url = 'http://numenta.org/licenses/cl/';
        }
        log.debug(response);
        callback(null, response);
    });
}

module.exports.validate = validator;
module.exports.name = NAME;
