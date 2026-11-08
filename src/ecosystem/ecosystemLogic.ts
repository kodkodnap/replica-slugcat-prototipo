export interface Vector2D {
  x: number;
  y: number;
}

export interface TileMapConfig {
  cols: number;
  rows: number;
  tileSize: number;
  waterLevelY: number;
}

/**
 * Checks if a world coordinate overlaps a solid tile.
 */
export function isSolidTile(
  x: number,
  y: number,
  tiles: number[][],
  config: TileMapConfig
): boolean {
  const col = Math.floor(x / config.tileSize);
  const row = Math.floor(y / config.tileSize);

  if (col < 0 || col >= config.cols || row < 0 || row >= config.rows) {
    return true; // Boundaries are solid
  }
  return tiles[row][col] === 1;
}

/**
 * Resolves vertical and horizontal AABB collision with tilemap.
 */
export function resolveTileCollision(
  pos: Vector2D,
  vel: Vector2D,
  radius: number,
  tiles: number[][],
  config: TileMapConfig
): { pos: Vector2D; vel: Vector2D; grounded: boolean } {
  let newX = pos.x + vel.x;
  let newY = pos.y + vel.y;
  let grounded = false;

  // Horizontal collision check
  if (vel.x > 0) {
    if (isSolidTile(newX + radius, pos.y, tiles, config)) {
      newX = Math.floor((newX + radius) / config.tileSize) * config.tileSize - radius - 0.1;
      vel.x = 0;
    }
  } else if (vel.x < 0) {
    if (isSolidTile(newX - radius, pos.y, tiles, config)) {
      newX = Math.floor((newX - radius) / config.tileSize + 1) * config.tileSize + radius + 0.1;
      vel.x = 0;
    }
  }

  // Vertical collision check
  if (vel.y < 0) {
    // Falling downwards
    if (
      isSolidTile(newX - radius * 0.7, newY - radius, tiles, config) ||
      isSolidTile(newX + radius * 0.7, newY - radius, tiles, config)
    ) {
      newY = Math.floor((newY - radius) / config.tileSize + 1) * config.tileSize + radius;
      vel.y = 0;
      grounded = true;
    }
  } else if (vel.y > 0) {
    // Jumping upwards
    if (
      isSolidTile(newX - radius * 0.7, newY + radius, tiles, config) ||
      isSolidTile(newX + radius * 0.7, newY + radius, tiles, config)
    ) {
      newY = Math.floor((newY + radius) / config.tileSize) * config.tileSize - radius - 0.1;
      vel.y = 0;
    }
  }

  return { pos: { x: newX, y: newY }, vel, grounded };
}

/**
 * Calculates buoyancy and water drag when submerged.
 */
export function calculateWaterForces(
  y: number,
  vy: number,
  vx: number,
  waterLevelY: number
): { buoyancy: number; dragX: number; dragY: number; inWater: boolean } {
  if (y >= waterLevelY) {
    return { buoyancy: 0, dragX: 1, dragY: 1, inWater: false };
  }

  const depth = waterLevelY - y;
  const buoyancy = Math.min(depth * 0.045, 0.42);
  const dragX = 0.88;
  const dragY = 0.85;

  return { buoyancy, dragX, dragY, inWater: true };
}

/**
 * Utility AI: Evaluates Slugcat state between FLEE, SEEK_FOOD, USE_PIPE, and WANDER.
 */
export function evaluateSlugcatAction(
  slugcatPos: Vector2D,
  lizardPos: Vector2D,
  nearestFoodPos: Vector2D | null,
  nearestPipePos: Vector2D | null,
  hungerLevel: number
): 'FLEE' | 'USE_PIPE' | 'SEEK_FOOD' | 'WANDER' {
  const distToLizard = Math.hypot(lizardPos.x - slugcatPos.x, lizardPos.y - slugcatPos.y);

  if (distToLizard < 180) {
    // If pipe is close and safer, use pipe
    if (nearestPipePos) {
      const distToPipe = Math.hypot(nearestPipePos.x - slugcatPos.x, nearestPipePos.y - slugcatPos.y);
      if (distToPipe < 100 && distToPipe < distToLizard * 0.8) {
        return 'USE_PIPE';
      }
    }
    return 'FLEE';
  }

  if (hungerLevel < 7 && nearestFoodPos) {
    return 'SEEK_FOOD';
  }

  return 'WANDER';
}
