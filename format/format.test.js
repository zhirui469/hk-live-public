import test from "node:test";
import assert from "node:assert/strict";
import { formatAqhi, formatTemp, nextTrain } from "./format.js";

test("formatTemp returns -- when the station list is empty", () => {
  assert.equal(formatTemp({ temperature: { data: [] } }), "--");
});

test("formatTemp finds the temperature station without relying on order", () => {
  const data = {
    temperature: {
      data: [
        { place: "Other", value: 18, unit: "C" },
        { place: "Hong Kong Observatory", value: "27", unit: "C" },
      ],
    },
  };
  assert.equal(formatTemp(data), "27°C");
});

test("formatTemp returns -- when the temperature station is missing", () => {
  const data = {
    temperature: {
      data: [{ place: "Other", value: 18, unit: "C" }],
    },
  };
  assert.equal(formatTemp(data), "--");
});

test("formatAqhi matches Central/Western exactly", () => {
  const data = [
    { station: "Central", aqhi: 9, health_risk: "Very High" },
    { station: "Central/Western", aqhi: 3, health_risk: "Low" },
  ];
  assert.equal(formatAqhi(data), "Central/Western\nAQHI 3\nHealth risk: Low");
});

test("formatAqhi does not confuse Central with Central/Western", () => {
  const data = [
    { station: "Central/Western", aqhi: 3, health_risk: "Low" },
    { station: "Central", aqhi: 7, health_risk: "High" },
  ];
  assert.equal(formatAqhi(data, "Central"), "Central\nAQHI 7\nHealth risk: High");
});

test("nextTrain converts ttnt text into a displayed whole number", () => {
  const data = {
    status: 1,
    data: {
      "ISL-HKU": {
        UP: [{ ttnt: "3", dest: "CHW", valid: "Y" }],
      },
    },
  };
  assert.equal(nextTrain(data), "3 min\nDestination code: CHW");
});

test("nextTrain rejects a response with status 0", () => {
  assert.throws(() => nextTrain({ status: 0 }), /unsuccessful status/);
});
