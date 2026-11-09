const test = require('node:test');
const assert = require('node:assert/strict');

test('formatTemp handles station lookup, missing station and invalid values', async () => {
  const { formatTemp } = await import('../format/format.js');

  assert.equal(formatTemp({
    temperature: {
      data: [
        { place: 'Other', value: 9, unit: 'C' },
        { place: 'Hong Kong Observatory', value: 32, unit: 'C' },
      ],
    },
  }), '32°C');

  assert.equal(formatTemp({ temperature: { data: [] } }), '--');
  assert.equal(formatTemp({
    temperature: {
      data: [{ place: 'Hong Kong Observatory', value: null, unit: 'C' }],
    },
  }), '--');
  assert.equal(formatTemp({
    temperature: {
      data: [{ place: 'Hong Kong Observatory', value: 32, unit: 'F' }],
    },
  }), '--');
});
