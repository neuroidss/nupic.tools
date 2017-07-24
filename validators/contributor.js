var contribUtil = require('../utils/contributors')
  , log = require('../utils/logger').logger
  , NAME = 'Contributor Validator'
  , WHITELIST = ['numenta-ci']
  ;

function isContributor(identity, roster) {
    if (! identity) return false;
    var found = false;
    roster.forEach(function(person) {
        if (person.Github == identity.login
            || person.Name == identity.name
            || person.Email == identity.email) {
            found = true;
        }
    });
    return found;
}

function validator(sha, githubUser, repoClient, callback) {
    log.info('Validating contributor "%s" for %s...', githubUser, sha);
    // If github user is on the whitelist, we approve.
    if (WHITELIST.indexOf(githubUser) > -1) {
        return callback(null, {
            state: 'success'
          , description: githubUser + ' is whitelisted as a contributor.'
          , target_url: 'https://github.com/' + githubUser
        });
    }
    contribUtil.getAll(repoClient.contributorsUrl, function(err, contributors) {
        var response = {};
        var userString = githubUser.login;
        if (! userString) {
            userString = githubUser.name;
        }
        // If there's an error, we'll handle it like a validation failure.
        if (err) {
            response.state = 'failure';
            response.description = 'Error running ' + NAME + ': ' + err;
        } else if (isContributor(githubUser, contributors)) {
            response.state = 'success';
            response.description = userString + ' signed the Contributor License';
            response.target_url = 'http://numenta.org/contributors/';
        } else {
            response.state = 'failure';
            response.description = userString
                + ' must sign the Contributor License';
            response.target_url = 'http://numenta.org/licenses/cl/';
        }
        log.debug(response);
        callback(null, response);
    });
}

module.exports.validate = validator;
module.exports.name = NAME;
