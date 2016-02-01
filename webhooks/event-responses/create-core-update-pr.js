var log = require('../../utils/logger').logger,
    GitData = require('github-data'),
    shaRegex = /[0-9a-f]{40}/;

function updater(payload, callback) {
    var mainFork = new GitData(
            process.env.GH_USERNAME,
            process.env.GH_PASSWORD,
            'numenta',
            'nupic'
        ),
        ciFork = new GitData(
            process.env.GH_USERNAME,
            process.env.GH_PASSWORD,
            'numenta-ci',
            'nupic'
        ),
        sha = payload.sha
      ;

    log.warn('Creating PR on NuPIC to update nupic.core to %s...', sha);
    mainFork.getBranch('master', function(error, master) {
        if (error) { return callback(error); }
        ciFork.getBranch('master', function(error, ciMaster) {
            if (error) { return callback(error); }
            ciFork.createBranch('core-update-' + sha, function(error, updateBranch) {
                updateBranch.getFile('.nupic_modules', function(error, file) {
                    var oldContents,
                        oldSha,
                        commitMessage;
                    if (error) { return callback(error); }
                    oldContents = file.blob.getContents();
                    oldSha = shaRegex.exec(oldContents)[0];
                    file.blob.setContents(oldContents.replace(oldSha, sha));
                    commitMessage = 'Updates nupic.core to ' + sha + '.';
                    file.commit(commitMessage, function(error, commit) {
                        if (error) { return callback(error); }
                        updateBranch.push(commit, function(error) {
                            var title, body;

                            if (error) { return callback(error); }

                            title = 'Updates nupic.core to latest build SHA.';
                            body = 'See https://github.com/numenta/nupic.core/compare/'
                                + oldSha + '...' + sha + ' for details.';
                            mainFork.createPullRequest(
                                updateBranch,
                                title,
                                body,
                                function(error, pr) {
                                    if (!error) {
                                        log.warn(
                                            'Created PR #%s at %s',
                                            pr.number, pr.html_url
                                        );
                                    }
                                    callback(error, pr);
                                }
                            );

                        });
                    });
                });
            });
        });
    });
}

module.exports = updater;