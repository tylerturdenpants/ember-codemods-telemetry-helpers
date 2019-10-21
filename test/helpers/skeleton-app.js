const fs = require('fs-extra');
const path = require('path');
const tmp = require('tmp');
const execa = require('execa');
const { EventEmitter } = require('events');
const debugLib = require('debug');

tmp.setGracefulCleanup();
const debug = debugLib('skeleton-app');

const getEmberPort = (() => {
  let lastPort = 4210;
  return () => lastPort++;
})();

module.exports = class SkeletonApp {
  constructor(appPath) {
    this.port = getEmberPort();
    this.watched = null;
    this.tmpDir = tmp.dirSync({
      tries: 10,
      unsafeCleanup: true,
      dir: process.cwd(),
      template: 'test-skeleton-app-XXXXXX',
    });
    this.classicAppDir = path.resolve(appPath);
    this.root = this.tmpDir.name;
    this.execOpts = { cwd: this.root, stderr: 'inherit' };
    fs.copySync(this.classicAppDir, this.root);
  }

  serve() {
    if (this.watched) {
      throw new Error('Already serving');
    }
    return (this.watched = new WatchedBuild(this._ember(['serve', '--port', `${this.port}`])));
  }

  teardown(signal) {
    if (this.watched) {
      this.watched.kill(signal, {
        forceKillAfterTimeout: 2000,
      });
    }
    this.tmpDir.removeCallback();
  }

  async install() {
    await execa('yarn', ['install'], this.execOpts);
  }

  _ember(args) {
    let ember = require.resolve('ember-cli/bin/ember');
    return execa.node(ember, args, this.execOpts);
  }
};

class WatchedBuild extends EventEmitter {
  constructor(ember) {
    super();
    this.ember = ember;
    ember.stdout.pipe(process.stdout);
    ember.stdout.on('data', data => {
      let output = data.toString();
      if (output.includes('Build successful')) {
        this.emit('did-rebuild');
      }

      debug(output);
    });
  }

  waitForBuild() {
    return new Promise((resolve, reject) => {
      this.once('did-rebuild', resolve);
      this.once('did-error', reject);
    });
  }

  kill(signal, opts) {
    this.ember.kill(signal, opts);
  }
}
