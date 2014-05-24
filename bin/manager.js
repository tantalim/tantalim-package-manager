#! /usr/bin/env node
'use strict';

/*
 * Most of this file was copied from https://github.com/bower/bower/blob/master/bin/bower
 */

process.bin = process.title = 'tantalim-pm';

var bowerDependencies = 'bower/node_modules/';
var Q = require(bowerDependencies + 'q');
var mout = require(bowerDependencies + 'mout');
var Logger = require(bowerDependencies + 'bower-logger');
var osenv = require(bowerDependencies + 'osenv');
var bower = require('bower/lib');
var pkg = require('../package.json');
var cli = require('bower/lib/util/cli');
var rootCheck = require('bower/lib/util/rootCheck');
var analytics = require('bower/lib/util/analytics');

var options;
var renderer;
var loglevel;
var command;
var commandFunc;
var logger;
var notifier;
var levels = Logger.LEVELS;

options = cli.readOptions({
    version: { type: Boolean, shorthand: 'v' },
    help: { type: Boolean, shorthand: 'h' },
    'allow-root': { type: Boolean }
});

// Handle print of version
if (options.version) {
    process.stdout.write(pkg.version + '\n');
    process.exit();
}

// Root check
rootCheck(options, bower.config);

// Set loglevel
if (bower.config.silent) {
    loglevel = levels.error;
} else if (bower.config.verbose) {
    loglevel = -Infinity;
    Q.longStackSupport = true;
} else if (bower.config.quiet) {
    loglevel = levels.warn;
} else {
    loglevel = levels[bower.config.loglevel] || levels.info;
}

// Get the command to execute
while (options.argv.remain.length) {
    command = options.argv.remain.join(' ');

    // Alias lookup
    if (bower.abbreviations[command]) {
        command = bower.abbreviations[command].replace(/\s/g, '.');
        break;
    }

    command = command.replace(/\s/g, '.');

    // Direct lookup
    if (mout.object.has(bower.commands, command)) {
        break;
    }

    options.argv.remain.pop();
}

// Ask for Insights on first run.
analytics.setup(bower.config).then(function () {
    // Execute the command
    commandFunc = command && mout.object.get(bower.commands, command);
    command = command && command.replace(/\./g, ' ');

    // If no command was specified, show bower help
    // Do the same if the command is unknown
    if (!commandFunc) {
        logger = bower.commands.help();
        command = 'help';
        // If the user requested help, show the command's help
        // Do the same if the actual command is a group of other commands (e.g.: cache)
    } else if (options.help || !commandFunc.line) {
        logger = bower.commands.help(command);
        command = 'help';
        // Call the line method
    } else {
        logger = commandFunc.line(process.argv);

        // If the method failed to interpret the process arguments
        // show the command help
        if (!logger) {
            logger = bower.commands.help(command);
            command = 'help';
        }
    }

    // Get the renderer and configure it with the executed command
    renderer = cli.getRenderer(command, logger.json, bower.config);

    logger
        .on('end', function (data) {
            if (!bower.config.silent && !bower.config.quiet) {
                renderer.end(data);
            }
        })
        .on('error', function (err) {
            if (levels.error >= loglevel) {
                renderer.error(err);
            }

            process.exit(1);
        })
        .on('log', function (log) {
            if (levels[log.level] >= loglevel) {
                renderer.log(log);
            }
        })
        .on('prompt', function (prompt, callback) {
            renderer.prompt(prompt)
                .then(function (answer) {
                    callback(answer);
                });
        });

    // Warn if HOME is not SET
    if (!osenv.home()) {
        logger.warn('no-home', 'HOME not set, user configuration will not be loaded');
    }

    if (bower.config.interactive) {
        var updateNotifier = require('update-notifier');

        // Check for newer version of Bower
        notifier = updateNotifier({
            packageName: pkg.name,
            packageVersion: pkg.version
        });

        if (notifier.update && levels.info >= loglevel) {
            renderer.updateNotice(notifier.update);
        }
    }
});
