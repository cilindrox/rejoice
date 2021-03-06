'use strict';

const Fs = require('fs');
const Os = require('os');
const Path = require('path');

const Code = require('code');
const Glue = require('glue');
const Hoek = require('hoek');
const Lab = require('lab');
const Rejoice = require('..');


// Declare internals

const internals = {};


// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const after = lab.after;
const expect = Code.expect;

describe('start()', () => {

    const consoleLog = console.log;
    console.log = Hoek.ignore;

    after((done) => {

        console.log = consoleLog;
        done();
    });

    const manifestFile = {
        server: {
            cache: {
                engine: 'catbox-memory'
            },
            app: {
                my: 'special-value'
            }
        },
        connections: [
            {
                port: 0,
                labels: ['api', 'nasty', 'test']
            }
        ],
        registrations: [
            {
                plugin: './--loaded'
            }
        ]
    };

    it('composes server with absolute path', (done) => {

        const configPath = Hoek.uniqueFilename(Os.tmpDir(), 'json');
        const modulePath = Path.join(__dirname, 'plugins');

        Fs.writeFileSync(configPath, JSON.stringify(manifestFile));

        const compose = Glue.compose;

        Glue.compose = function (manifest, packOptions, callback) {

            expect(manifest.registrations[0].plugin[0]).to.exist();
            expect(manifest.server).to.exist();
            expect(packOptions.relativeTo).to.be.a.string();

            compose(manifest, packOptions, (err, server) => {

                expect(err).to.not.exist();
                expect(server).to.exist();

                server.start = function () {

                    Glue.compose = compose;
                    Fs.unlinkSync(configPath);
                    done();
                };
                callback(err, server);
            });
        };

        Rejoice.start({
            args: ['-c', configPath, '-p', modulePath]
        });
    });

    it('composes server with an extra module', (done) => {

        const configPath = Hoek.uniqueFilename(Os.tmpDir(), 'json');
        const modulePath = Path.join(__dirname, 'plugins');
        const extraPath = Hoek.uniqueFilename(Os.tmpDir(), 'js');
        const extra = 'console.log(\'test passed\')';

        Fs.writeFileSync(configPath, JSON.stringify(manifestFile));
        Fs.writeFileSync(extraPath, extra);

        const compose = Glue.compose;

        Glue.compose = function (manifest, packOptions, callback) {

            expect(manifest.registrations[0].plugin[0]).to.exist();
            expect(manifest.server).to.exist();
            expect(packOptions).to.exist();

            packOptions.relativeTo = modulePath;

            compose(manifest, packOptions, (err, server) => {

                expect(err).to.not.exist();
                expect(server).to.exist();

                server.start = function () {

                    Glue.compose = compose;
                    Fs.unlinkSync(extraPath);
                    Fs.unlinkSync(configPath);
                    done();
                };
                callback(err, server);
            });
        };

        Rejoice.start({
            args: ['-c', configPath, '--require', extraPath]
        });
    });

    it('uses the --p option when loading extra modules by name', (done) => {

        const configPath = Hoek.uniqueFilename(Os.tmpDir(), 'json');
        const modulePath = Path.join(__dirname, 'plugins');

        Fs.writeFileSync(configPath, JSON.stringify(manifestFile));

        const compose = Glue.compose;
        const realpathSync = Fs.realpathSync;
        const consoleError = console.error;

        console.error = function (value) {

            expect(value).to.not.exist();
        };

        Fs.realpathSync = function () {

            Fs.realpathSync = realpathSync;
            return process.cwd();
        };

        Glue.compose = function (manifest, packOptions, callback) {

            expect(manifest.registrations[0].plugin[0]).to.exist();
            expect(manifest.server).to.exist();
            expect(packOptions).to.exist();

            compose(manifest, packOptions, (err, server) => {

                expect(err).to.not.exist();
                expect(server).to.exist();

                server.start = function () {

                    Glue.compose = compose;
                    console.error = consoleError;
                    Fs.unlinkSync(configPath);
                    done();
                };
                callback(err, server);
            });
        };

        Rejoice.start({
            args: ['-c', configPath, '-p', modulePath, '--require', 'hoek']
        });
    });

    it('uses the --p option when loading extra modules by relative path', (done) => {

        const configPath = Hoek.uniqueFilename(Os.tmpDir(), 'json');
        const modulePath = Path.join(__dirname, 'plugins');

        Fs.writeFileSync(configPath, JSON.stringify(manifestFile));

        const compose = Glue.compose;
        const realpathSync = Fs.realpathSync;
        const consoleError = console.error;

        console.error = function (value) {

            expect(value).to.not.exist();
        };

        Fs.realpathSync = function () {

            Fs.realpathSync = realpathSync;
            return process.cwd();
        };

        Glue.compose = function (manifest, packOptions, callback) {

            expect(manifest.registrations[0].plugin[0]).to.exist();
            expect(manifest.server).to.exist();
            expect(packOptions).to.exist();

            compose(manifest, packOptions, (err, server) => {

                expect(err).to.not.exist();
                expect(server).to.exist();

                server.start = function () {

                    Glue.compose = compose;
                    console.error = consoleError;
                    Fs.unlinkSync(configPath);
                    done();
                };
                callback(err, server);
            });
        };

        Rejoice.start({
            args: ['-c', configPath, '-p', modulePath, '--require', './node_modules/hoek']
        });
    });

    it('exits the process if the extra module can not be loaded', (done) => {

        const configPath = Hoek.uniqueFilename(Os.tmpDir(), 'json');

        Fs.writeFileSync(configPath, JSON.stringify(manifestFile));

        const exit = process.exit;
        const consoleError = console.error;

        console.error = function (string, path) {

            expect(string).to.equal('Unable to require extra file: %s (%s)');
            expect(path).to.equal('/foo/bar');
        };

        process.exit = function (value) {

            process.exit = exit;
            expect(value).to.equal(1);

            console.error = consoleError;

            Fs.unlinkSync(configPath);

            done();
        };

        Rejoice.start({
            args: ['-c', configPath, '--require', '/foo/bar']
        });
    });

    it('loads a manifest with a relative path', (done) => {

        const configPath = Hoek.uniqueFilename(Os.tmpDir(), 'json');
        const m = Hoek.clone(manifestFile);

        m.registrations = [];

        Fs.writeFileSync(configPath, JSON.stringify(m));

        const relativePath = Path.relative(process.cwd(), configPath);

        const compose = Glue.compose;

        Glue.compose = function (manifest, packOptions, callback) {

            expect(manifest.server).to.exist();
            expect(packOptions).to.exist();

            compose(manifest, packOptions, (err, server) => {

                expect(err).to.not.exist();
                expect(server).to.exist();

                server.start = function () {

                    Glue.compose = compose;
                    Fs.unlinkSync(configPath);
                    done();
                };
                callback(err, server);
            });
        };

        Rejoice.start({
            args: ['-c', relativePath]
        });
    });

    it('exits the process if the manifest file files to parse', (done) => {

        const configPath = Hoek.uniqueFilename(Os.tmpDir(), 'json');

        Fs.writeFileSync(configPath, JSON.stringify(manifestFile) + ']]');

        const exit = process.exit;
        const consoleError = console.error;

        console.error = function (value) {

            expect(value).to.match(/Failed loading configuration file: /);
        };

        process.exit = function (value) {

            process.exit = exit;
            expect(value).to.equal(1);

            console.error = consoleError;

            Fs.unlinkSync(configPath);

            done();
        };

        Rejoice.start({
            args: ['-c', configPath]
        });
    });

    it('will error if there is an error loading packs from -p', (done) => {

        const configPath = Hoek.uniqueFilename(Os.tmpDir(), 'json');
        const modulePath = Path.join(__dirname, 'plugins');

        Fs.writeFileSync(configPath, JSON.stringify(manifestFile));

        const realpath = Fs.realpath;
        const consoleError = console.error;
        const exit = process.exit;

        console.error = function (value) {

            expect(value.message).to.equal('mock error');
        };

        process.exit = function (value) {

            process.exit = exit;
            expect(value).to.equal(1);
            console.error = consoleError;

            Fs.unlinkSync(configPath);
            done();
        };


        Fs.realpath = function (path, callback) {

            expect(path).to.equal(modulePath);
            Fs.realpath = realpath;
            callback(new Error('mock error'));
        };

        Rejoice.start({
            args: ['-c', configPath, '-p', modulePath]
        });
    });

    it('parses $prefixed values as environment variable values', { parallel: false }, (done) => {

        const m = Hoek.clone(manifestFile);

        m.server.app.my = '$env.special_value';
        m.connections = [
            {
                port: '$env.undefined',
                labels: ['api', 'nasty', 'test']
            },
            {
                host: '$env.host',
                port: '$env.port',
                labels: ['api', 'nice']
            }
        ];
        m.registrations = [
            {
                plugin: {
                    register: './--options',
                    options: {
                        key: '$env.plugin_option'
                    }
                }
            }
        ];

        const changes = [];
        const setEnv = function (key, value) {

            const previous = process.env[key];

            if (typeof value === 'undefined') {
                delete process.env[key];
            }
            else {
                process.env[key] = value;
            }

            return setEnv.bind(null, key, previous);
        };

        changes.push(setEnv('host', 'localhost'));
        changes.push(setEnv('plugin_option', 'plugin-option'));
        changes.push(setEnv('port', 0));
        changes.push(setEnv('special_value', 'special-value'));
        // Ensure that the 'undefined' environment variable is *not* set.
        changes.push(setEnv('undefined'));

        const configPath = Hoek.uniqueFilename(Os.tmpDir(), 'json');
        const modulePath = Path.join(__dirname, 'plugins');

        Fs.writeFileSync(configPath, JSON.stringify(m));

        const compose = Glue.compose;

        Glue.compose = function (manifest, packOptions, callback) {

            expect(manifest.connections).to.have.length(2);
            expect(manifest.connections[0].port).to.be.undefined();
            expect(manifest.connections[1].port).to.equal('0');
            expect(manifest.connections[1].host).to.equal('localhost');
            expect(manifest.registrations[0].plugin.options).to.deep.equal({
                key: 'plugin-option'
            });
            expect(manifest.server.app).to.deep.equal({
                my: 'special-value'
            });

            compose(manifest, packOptions, (err, server) => {

                expect(err).to.not.exist();
                expect(server).to.exist();

                server.start = function () {

                    Glue.compose = compose;
                    Fs.unlinkSync(configPath);

                    // Put the env variables back
                    let restore = changes.pop();
                    while (restore) {
                        restore();
                        restore = changes.pop();
                    }
                    done();
                };
                callback(err, server);
            });
        };

        Rejoice.start({
            args: ['-c', configPath, '-p', modulePath]
        });
    });

    it('exits the process if the arguments are invalid', (done) => {

        const consoleError = console.error;
        const exit = process.exit;

        console.error = function (value) {

            expect(value).to.match(/rejoice -c manifest.json [-p node_modules_path -r pre_load_module]/);
        };

        process.exit = function (code) {

            process.exit = exit;
            expect(code).to.equal(1);

            console.error = consoleError;
            done();
        };

        Rejoice.start({
            args: []
        });
    });

    it('prints help with the -h argument', (done) => {

        const exit = process.exit;

        console.log = function (value) {

            expect(value).to.match(/rejoice -c manifest.json [-p node_modules_path -r pre_load_module]/);
        };

        process.exit = function (code) {

            process.exit = exit;
            expect(code).to.equal(1);

            console.log = Hoek.ignore;
            done();
        };

        Rejoice.start({
            args: ['-h', '-c', 'foo.json']
        });
    });

    it('throws an error if there are problems loading the plugins', (done) => {

        const configPath = Hoek.uniqueFilename(Os.tmpDir(), 'json');
        const modulePath = Path.join(__dirname, 'plugins');
        const m = Hoek.clone(manifestFile);

        Fs.writeFileSync(configPath, JSON.stringify(m));

        const compose = Glue.compose;

        Glue.compose = function (manifest, packOptions, callback) {

            expect(manifest.server).to.exist();
            expect(packOptions).to.exist();

            compose(manifest, packOptions, (err, server) => {

                expect(err).to.not.exist();
                expect(server).to.exist();

                expect(() => {

                    callback(new Error('mock error'), server);
                }).to.throw(Error, /mock error/);

                Glue.compose = compose;
                Fs.unlinkSync(configPath);

                done();
            });
        };

        Rejoice.start({
            args: ['-c', configPath, '-p', modulePath]
        });
    });

    it('throws an error if there is a problem starting the server', (done) => {

        const configPath = Hoek.uniqueFilename(Os.tmpDir(), 'json');
        const modulePath = Path.join(__dirname, 'plugins');
        const m = Hoek.clone(manifestFile);

        Fs.writeFileSync(configPath, JSON.stringify(m));

        const compose = Glue.compose;

        Glue.compose = function (manifest, packOptions, callback) {

            expect(manifest.server).to.exist();
            expect(packOptions).to.exist();

            compose(manifest, packOptions, (err, server) => {

                expect(err).to.not.exist();
                expect(server).to.exist();

                server.start = function (cb) {

                    Glue.compose = compose;
                    Fs.unlinkSync(configPath);

                    expect(() => {

                        cb(new Error('mock error'));
                    }).to.throw(Error, /mock error/);

                    done();
                };

                callback(err, server);
            });
        };

        Rejoice.start({
            args: ['-c', configPath, '-p', modulePath]
        });
    });

    it('kills the process on SIGQUIT and restarts on SIGUSR2', (done) => {

        const configPath = Hoek.uniqueFilename(Os.tmpDir(), 'json');
        const modulePath = Path.join(__dirname, 'plugins');
        const m = Hoek.clone(manifestFile);

        Fs.writeFileSync(configPath, JSON.stringify(m));

        const compose = Glue.compose;
        const exit = process.exit;
        const start = Rejoice.start;

        // There are many of these already attached
        process.removeAllListeners('SIGUSR2');
        process.removeAllListeners('SIGQUIT');

        Glue.compose = function (manifest, packOptions, callback) {

            expect(manifest.server).to.exist();
            expect(packOptions).to.exist();

            compose(manifest, packOptions, (err, server) => {

                expect(err).to.not.exist();
                expect(server).to.exist();

                server.stop = function (cbStop) {

                    return cbStop();
                };

                server.start = function (cbStart) {

                    Glue.compose = compose;
                    Fs.unlinkSync(configPath);

                    cbStart();

                    process.exit = function (value) {

                        process.exit = exit;
                        expect(value).to.equal(0);
                    };

                    Rejoice.start = function (options) {

                        Rejoice.start = start;

                        expect(options).to.deep.equal({
                            args: ['-c', configPath, '-p', modulePath]
                        });

                        done();
                    };

                    process.emit('SIGQUIT');
                    process.emit('SIGUSR2');
                };

                callback(err, server);
            });
        };

        Rejoice.start({
            args: ['-c', configPath, '-p', modulePath]
        });
    });
});
