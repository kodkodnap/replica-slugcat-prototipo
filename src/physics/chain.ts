export interface Point2D {
  x: number;
  y: number;
}

export interface SegmentNode extends Point2D {
  vx: number;
  vy: number;
  radius: number;
  angle: number;
}

/**
 * Enforces fixed distance constraint between child node and parent node.
 * Repositions child node along the direction vector if distance exceeds or differs from length.
 */
export function solveDistanceConstraint(
  parent: Point2D,
  child: Point2D,
  segmentLength: number
): Point2D {
  const dx = child.x - parent.x;
  const dy = child.y - parent.y;
  const dist = Math.hypot(dx, dy);

  if (dist === 0) {
    // If overlapping, offset slightly downwards
    return { x: parent.x, y: parent.y - segmentLength };
  }

  const ratio = segmentLength / dist;
  return {
    x: parent.x + dx * ratio,
    y: parent.y + dy * ratio,
  };
}

/**
 * Tail whip / inertia step:
 * Applies inertia/spring to child node velocity, updates position, then enforces distance constraint.
 * Includes gentle spinal alignment so the tail naturally relaxes into a graceful curve at low speeds.
 */
export function updateTailNode(
  parent: Point2D & { angle?: number },
  node: SegmentNode,
  segmentLength: number,
  spring: number = 0.35,
  damping: number = 0.82
): void {
  // Target position is trailing behind parent along current direction
  const dx = node.x - parent.x;
  const dy = node.y - parent.y;
  const currentDist = Math.hypot(dx, dy) || 1;

  // Spring force towards constrained distance
  let targetX = parent.x + (dx / currentDist) * segmentLength;
  let targetY = parent.y + (dy / currentDist) * segmentLength;

  // If parent has a defined spine angle, add subtle alignment force to prevent kinked tail at rest
  if (parent.angle !== undefined) {
    const alignX = parent.x - Math.cos(parent.angle) * segmentLength;
    const alignY = parent.y - Math.sin(parent.angle) * segmentLength;
    const currentSpeed = Math.hypot(node.vx, node.vy);
    const alignWeight = Math.max(0.15, 0.45 - currentSpeed * 0.05);
    targetX = targetX * (1 - alignWeight) + alignX * alignWeight;
    targetY = targetY * (1 - alignWeight) + alignY * alignWeight;
  }

  node.vx = (node.vx + (targetX - node.x) * spring) * damping;
  node.vy = (node.vy + (targetY - node.y) * spring) * damping;

  node.x += node.vx;
  node.y += node.vy;

  // Hard distance constraint
  const constrained = solveDistanceConstraint(parent, node, segmentLength);
  node.x = constrained.x;
  node.y = constrained.y;

  // Segment angle facing towards parent
  node.angle = Math.atan2(parent.y - node.y, parent.x - node.x);
}

/**
 * Calculates direction angle between two 2D points.
 */
export function calculateSegmentAngle(from: Point2D, to: Point2D): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/**
 * Calculates look-at eye offset vector clamped to maxDistance.
 */
export function calculateLookAtOffset(
  headPos: Point2D,
  targetPos: Point2D,
  maxOffset: number = 4
): Point2D {
  const dx = targetPos.x - headPos.x;
  const dy = targetPos.y - headPos.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 0.001) return { x: 0, y: 0 };
  const scale = Math.min(dist, maxOffset) / dist;
  return {
    x: dx * scale,
    y: dy * scale,
  };
}

/**
 * Generates breathing pulse scale factor for torso when idle or moving slowly.
 */
export function calculateBreathingScale(timeSeconds: number, speed: number): number {
  const idleFactor = Math.max(0, 1 - speed / 120);
  const breath = Math.sin(timeSeconds * 3.5) * 0.05 * idleFactor;
  return 1 + breath;
}

export interface PawPosition {
  x: number;
  y: number;
}

export interface QuadrupedPaws {
  frontLeft: PawPosition;
  frontRight: PawPosition;
  rearLeft: PawPosition;
  rearRight: PawPosition;
}

/**
 * Calculates 4-paw procedural positions (front paws on chest, rear paws on pelvis)
 * with alternating scamper gait when moving, tucking when idle, and reaching when pouncing.
 */
export function calculatePawsGait(
  chest: Point2D & { angle: number; radius: number },
  pelvis: Point2D & { angle: number; radius: number },
  stepPhase: number,
  speed: number,
  isPouncing: boolean
): QuadrupedPaws {
  // Tangent & Normal for chest
  const cCos = Math.cos(chest.angle);
  const cSin = Math.sin(chest.angle);
  const cNormX = -cSin;
  const cNormY = cCos;

  // Tangent & Normal for pelvis
  const pCos = Math.cos(pelvis.angle);
  const pSin = Math.sin(pelvis.angle);
  const pNormX = -pSin;
  const pNormY = pCos;

  const moveRatio = Math.min(1, speed / 3.0);

  if (isPouncing) {
    // Pounce pose: front paws stretch forward, rear paws kick backward
    return {
      frontLeft: {
        x: chest.x + cNormX * (chest.radius + 3) + cCos * 16,
        y: chest.y + cNormY * (chest.radius + 3) + cSin * 16,
      },
      frontRight: {
        x: chest.x - cNormX * (chest.radius + 3) + cCos * 16,
        y: chest.y - cNormY * (chest.radius + 3) + cSin * 16,
      },
      rearLeft: {
        x: pelvis.x + pNormX * (pelvis.radius + 2) - pCos * 18,
        y: pelvis.y + pNormY * (pelvis.radius + 2) - pSin * 18,
      },
      rearRight: {
        x: pelvis.x - pNormX * (pelvis.radius + 2) - pCos * 18,
        y: pelvis.y - pNormY * (pelvis.radius + 2) - pSin * 18,
      },
    };
  }

  // Alternating walk/crawl scamper cycle
  const swingAmp = 11 * moveRatio;
  const flSwing = Math.sin(stepPhase) * swingAmp;
  const frSwing = Math.sin(stepPhase + Math.PI) * swingAmp;
  const rlSwing = Math.sin(stepPhase + Math.PI) * (swingAmp * 0.9);
  const rrSwing = Math.sin(stepPhase) * (swingAmp * 0.9);

  return {
    frontLeft: {
      x: chest.x + cNormX * (chest.radius + 5) + cCos * flSwing,
      y: chest.y + cNormY * (chest.radius + 5) + cSin * flSwing,
    },
    frontRight: {
      x: chest.x - cNormX * (chest.radius + 5) + cCos * frSwing,
      y: chest.y - cNormY * (chest.radius + 5) + cSin * frSwing,
    },
    rearLeft: {
      x: pelvis.x + pNormX * (pelvis.radius + 4) + pCos * rlSwing,
      y: pelvis.y + pNormY * (pelvis.radius + 4) + pSin * rlSwing,
    },
    rearRight: {
      x: pelvis.x - pNormX * (pelvis.radius + 4) + pCos * rrSwing,
      y: pelvis.y - pNormY * (pelvis.radius + 4) + pSin * rrSwing,
    },
  };
}
