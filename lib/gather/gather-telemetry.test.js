const SkeletonApp = require('../../test/helpers/skeleton-app');
const gatherTelemetry = require('./gather-telemetry');
const { getTelemetry } = require('../utils/telemetry');
const analyzeEmberObject = require('../gather/analyze-ember-object');
const APP_TIMEOUT = 100000;

function helper(possibleEmberObject) {
  if (
    possibleEmberObject &&
    possibleEmberObject.default &&
    possibleEmberObject.default.isHelperFactory
  ) {
    return true;
  }
}

describe('Provide a personalized `Gathering Function`', () => {
  let app = new SkeletonApp('./test/fixtures/classic-app');
  let url = `http://localhost:${app.port}`;
  let server;

  beforeAll(async () => {
    await app.install();
    server = app.serve();
    await server.waitForBuild();
  }, APP_TIMEOUT);

  test('can determine helpers with simple a function', async () => {
    await gatherTelemetry(url, helper);
    let telemetry = getTelemetry();
    expect(telemetry).toEqual({
      'ember-inflector/lib/helpers/pluralize': true,
      'ember-inflector/lib/helpers/singularize': true,
      'input/helpers/app-version': true,
      'input/helpers/pluralize': true,
      'input/helpers/singularize': true,
    });
  });

  test('can determine components with a robust function', async () => {
    await gatherTelemetry(url, analyzeEmberObject);
    let telemetry = getTelemetry();
    expect(Object.keys(telemetry).filter(Boolean).length).toEqual(1);
  });

  afterAll(async () => {
    app.teardown('SIGTERM');
    console.log(server.ember.pid);
  }, APP_TIMEOUT);
});
