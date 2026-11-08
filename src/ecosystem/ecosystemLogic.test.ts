import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSolidTile,
  resolveTileCollision,
  calculateWaterForces,
  evaluateSlugcatAction,
  TileMapConfig,
} from './ecosystemLogic.ts';

const mockConfig: TileMapConfig = {
  cols: 10,
  rows: 10,
  tileSize: 30,
  waterLevelY: 60,
};

const mockTiles = Array.from({ length: 10 }, (_, r) =>
  Array.from({ length: 10 }, (_, c) => (r === 0 ? 1 : 0))
);

test('isSolidTile accurately detects walls and out of bounds', () => {
  assert.equal(isSolidTile(15, 15, mockTiles, mockConfig), true); // row 0 is solid
  assert.equal(isSolidTile(15, 45, mockTiles, mockConfig), false); // row 1 is air
  assert.equal(isSolidTile(-5, 45, mockTiles, mockConfig), true); // out of bounds
});

test('resolveTileCollision detects ground landing when falling', () => {
  const pos = { x: 45, y: 35 };
  const vel = { x: 0, y: -8 };
  const radius = 10;

  const result = resolveTileCollision(pos, vel, radius, mockTiles, mockConfig);
  assert.equal(result.grounded, true);
  assert.equal(result.vel.y, 0);
  assert.ok(result.pos.y >= 30 + radius);
});

test('calculateWaterForces applies buoyancy and drag when submerged', () => {
  const deepForces = calculateWaterForces(20, -2, 5, 60);
  assert.equal(deepForces.inWater, true);
  assert.ok(deepForces.buoyancy > 0);
  assert.ok(deepForces.dragX < 1.0);

  const dryForces = calculateWaterForces(100, -2, 5, 60);
  assert.equal(dryForces.inWater, false);
  assert.equal(dryForces.buoyancy, 0);
});

test('evaluateSlugcatAction priorities FLEE when lizard is nearby', () => {
  const slug = { x: 100, y: 100 };
  const lizard = { x: 140, y: 100 }; // dist = 40 (danger!)
  const food = { x: 90, y: 100 };
  const action = evaluateSlugcatAction(slug, lizard, food, null, 2);
  assert.equal(action, 'FLEE');
});

test('evaluateSlugcatAction prioritizes SEEK_FOOD when safe and hungry', () => {
  const slug = { x: 100, y: 100 };
  const lizard = { x: 600, y: 100 }; // far away
  const food = { x: 120, y: 100 };
  const action = evaluateSlugcatAction(slug, lizard, food, null, 3);
  assert.equal(action, 'SEEK_FOOD');
});

test('evaluateSlugcatAction chooses USE_PIPE if pipe is an escape route', () => {
  const slug = { x: 100, y: 100 };
  const lizard = { x: 190, y: 100 }; // close
  const pipe = { x: 120, y: 100 }; // very close pipe
  const action = evaluateSlugcatAction(slug, lizard, null, pipe, 5);
  assert.equal(action, 'USE_PIPE');
});
