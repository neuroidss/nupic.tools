var assert = require('assert'),
    fs = require('fs'),
    connect = require('connect'),
    colors = require('colors'),
    
    RepositoryClient = require('./utils/repoClient'),
    githubHookHandler = require('./githubHook'),
    cfg = require('./utils/configReader').read('./conf/config.json'),

    HOST = cfg.host,
    PORT = cfg.port || 8081,

    baseUrl = 'http://' + HOST + ':' + PORT,
    githubHookPath = '/github-hook',
    pullRequestWebhookUrl = baseUrl + githubHookPath,

    HANDLER_DIR = './handlers',
    handlers = [],

    repoClients = {},

    channelName = 'nupic';

function die(err) {
    console.error(err);
    process.exit(-1);
}

function initializeHandlers(dir) {
    fs.readdirSync(dir).forEach(function(handler) {
        handlers.push(require(dir + '/' + handler.split('.').shift()));
    });
}

function establishWebHooks(config, callback) {
    var count = 0;
    // Set up one github client for each repo target in config.
    Object.keys(config.monitors).forEach(function(monitorKey) {
        var monitorConfig = config.monitors[monitorKey],
            keyParts = monitorKey.split('/'),
            org = keyParts.shift(),
            repo = keyParts.shift(),
            repoClient;

        monitorConfig.organization = org;
        monitorConfig.repository = repo;

        repoClient = new RepositoryClient(monitorConfig);
        console.log('RepositoryClient created for ' + monitorConfig.username.magenta + ' on ' + repoClient.toString().magenta);

        repoClient.confirmWebhookExists(pullRequestWebhookUrl, 'pull_request', function(err, hook) {
            if (err) {
                console.error(('Error during webhook confirmation for ' + repoClient.toString()).red);
                die(err);
            } else {
                if (hook) {
                    console.log(('Webhook created on ' + repoClient.toString() + ':\n'
                                            + '\tfor "' + hook.events.join(', ') + '"\n'
                                            + '\ton ' + hook.config.url).yellow);
                } else {
                    console.log(('Webhook exists for ' + repoClient.toString()).green);
                }
                count++;
            }
            repoClients[monitorKey] = repoClient;
            if (count == (Object.keys(config.monitors).length))  {
                callback();
            }
        });
    });
}

console.log('nupic.tools server starting...'.green);
console.log('nupic.tools will use the following configuration:');
console.log(JSON.stringify(cfg, null, 2).yellow);

establishWebHooks(cfg, function() {

    var app = connect()
        .use(connect.logger('dev'))
        .use(connect.bodyParser())
        .use(githubHookPath, githubHookHandler(repoClients))

    initializeHandlers(HANDLER_DIR);

    handlers.forEach(function(handlerConfig) {
        var urls = Object.keys(handlerConfig);
        urls.forEach(function(url) {
            var handler = handlerConfig[url](repoClients, handlers, cfg),
                name = handler.name,
                desc = handler.description,
                msg = '==> ' + name + ' listening for url pattern: ' + url;
            if (! handler.disabled) {
                console.log(msg.cyan);
                app.use(url, handler);
            }
        });
    });
        
    app.listen(PORT, function() {
        console.log(('\nServer running at ' + baseUrl + '\n').green);
    });

});
