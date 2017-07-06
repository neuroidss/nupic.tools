var log = require('../../utils/logger').logger,
    shaValidator = require('../../utils/sha-validator');

function issueCommentHandler(payload, config, repoClient, validators, callback) {
    var prNumber = payload.issue.number;

    // Ignore comments on issues, we only want to take action on pull requests.
    if (! payload.issue.pull_request) {
        return callback();
    }

    repoClient.getLastCommitOnPullRequest(prNumber, function(err, payload) {
        if (err) return log.error(err);
        var login, email, name;
        // If there is an author, we know their github login
        if (payload.author) {
            login = payload.author.login;
        } else if (payload.commit.committer) {
            // This happens when there is no Github username, but we can find
            // out name and email address
            name = payload.commit.committer.name;
            email = payload.commit.committer.email;
        } else {
            log.warn('Cannot identify PR committer!');
            log.warn(JSON.stringify(payload, null, 2));
            return;
        }
        shaValidator.performCompleteValidation(
            payload.sha
          , {login: login, name: name, email: email}
          , repoClient
          , validators
          , true
          , callback
        );
    });
}

module.exports = issueCommentHandler;
