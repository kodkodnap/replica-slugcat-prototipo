import test from 'node:test';
import assert from 'node:assert/strict';
import {
  solveDistanceConstraint,
  updateTailNode,
  calculateSegmentAngle,
  calculateLookAtOffset,
  calculateBreathingScale,
  calculatePawsGait,
  SegmentNode,
} from './chain.ts';

test('solveDistanceConstraint preserves exact segment length', () => {
  const parent = { x: 100, y: 100 };
  const child = { x: 150, y: 100 };
  const targetLength = 20;

  const resolved = solveDistanceConstraint(parent, child, targetLength);
  const dist = Math.hypot(resolved.x - parent.x, resolved.y - parent.y);

  assert.ok(Math.abs(dist - targetLength) < 1e-6, `Expected distance ${targetLength}, got ${dist}`);
  assert.equal(resolved.y, 100);
  assert.equal(resolved.x, 120);
});

test('solveDistanceConstraint handles diagonal orientation correctly', () => {
  const parent = { x: 0, y: 0 };
  const child = { x: 30, y: 40 }; // dist = 50
  const targetLength = 25;

  const resolved = solveDistanceConstraint(parent, child, targetLength);
  const dist = Math.hypot(resolved.x - parent.x, resolved.y - parent.y);

  assert.ok(Math.abs(dist - 25) < 1e-6);
  assert.ok(Math.abs(resolved.x - 15) < 1e-6);
  assert.ok(Math.abs(resolved.y - 20) < 1e-6);
});

test('updateTailNode updates velocity and enforces distance constraint', () => {
  const parent = { x: 50, y: 50 };
  const node: SegmentNode = {
    x: 100,
    y: 50,
    vx: 0,
    vy: 0,
    radius: 10,
    angle: 0,
  };

  const segmentLength = 20;
  updateTailNode(parent, node, segmentLength, 0.5, 0.8);

  const dist = Math.hypot(node.x - parent.x, node.y - parent.y);
  assert.ok(Math.abs(dist - segmentLength) < 1e-6, `Distance should be ${segmentLength}`);
  assert.ok(Math.abs(node.angle - Math.PI) < 1e-6, 'Angle facing towards parent');
});

test('calculateSegmentAngle computes correct radians', () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 10, y: 0 };
  assert.equal(calculateSegmentAngle(p1, p2), 0);

  const p3 = { x: 0, y: 10 };
  assert.equal(calculateSegmentAngle(p1, p3), Math.PI / 2);
});

test('calculateLookAtOffset clamps within max offset', () => {
  const head = { x: 0, y: 0 };
  const target = { x: 1000, y: 0 };
  const offset = calculateLookAtOffset(head, target, 5);

  assert.equal(offset.x, 5);
  assert.equal(offset.y, 0);
});

test('calculateBreathingScale scales down with movement speed', () => {
  const idleScale = calculateBreathingScale(0.5, 0);
  const movingScale = calculateBreathingScale(0.5, 500);

  assert.notEqual(idleScale, 1);
  assert.equal(movingScale, 1); // no idle breathing when dashing fast
});

test('calculatePawsGait produces 4 symmetrical paws in idle and alternating in motion', () => {
  const chest = { x: 0, y: 0, angle: Math.PI / 2, radius: 20 };
  const pelvis = { x: 0, y: -40, angle: Math.PI / 2, radius: 18 };

  const idlePaws = calculatePawsGait(chest, pelvis, 0, 0, false);
  assert.ok(idlePaws.frontLeft.x < 0);
  assert.ok(idlePaws.frontRight.x > 0);
  assert.ok(idlePaws.rearLeft.x < 0);
  assert.ok(idlePaws.rearRight.x > 0);

  const pouncePaws = calculatePawsGait(chest, pelvis, 0, 10, true);
  // Front paws extend forward (y > chest.y)
  assert.ok(pouncePaws.frontLeft.y > chest.y);
  assert.ok(pouncePaws.frontRight.y > chest.y);
  // Rear paws extend backward (y < pelvis.y)
  assert.ok(pouncePaws.rearLeft.y < pelvis.y);
  assert.ok(pouncePaws.rearRight.y < pelvis.y);
});
