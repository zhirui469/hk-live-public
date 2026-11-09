const test = require('node:test');
const assert = require('node:assert/strict');

const train = (ttnt) => ({
  status: 1,
  data: {
    'ISL-HKU': {
      UP: [{ ttnt, dest: 'CHW', valid: 'Y' }],
    },
  },
});

test('formatAqhi uses exact station matching and accepts 10+', async () => {
  const { formatAqhi } = await import('../format/format.js');
  const aqhi = [
    { station: 'Central', aqhi: 9, health_risk: 'Very High' },
    { station: 'Central/Western', aqhi: 3, health_risk: 'Low' },
  ];

  assert.equal(formatAqhi(aqhi), 'Central/Western\nAQHI 3\nHealth risk: Low');
  assert.throws(() => formatAqhi([aqhi[0]]));
  assert.throws(() => formatAqhi(null));
  assert.equal(formatAqhi([{ station: 'Central/Western', aqhi: '10+', health_risk: 'Serious' }]), 'Central/Western\nAQHI 10+\nHealth risk: Serious');
});

test('nextTrain handles integer minutes, status checks and invalid values', async () => {
  const { nextTrain } = await import('../format/format.js');

  for (const value of ['3', '0', '01']) {
    assert.equal(nextTrain(train(value)), `${Number(value)} min\nDestination code: CHW`);
  }
  for (const value of [null, '', 'N/A', '-1', '1.5', false]) {
    assert.throws(() => nextTrain(train(value)));
  }
  for (const payload of [{ status: 0 }, { status: '1' }, { status: 1 }]) {
    assert.throws(() => nextTrain(payload));
  }
  assert.equal(nextTrain({ status: 1, data: { 'ISL-HKU': { UP: [] } } }), 'No upcoming trains in this direction.');
});
