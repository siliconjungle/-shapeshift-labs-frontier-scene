import assert from 'node:assert';
import { createSceneGraph } from '../dist/index.js';

const args = parseArgs(process.argv.slice(2));
const cases = readPositiveInt(args.cases, 300);
let seed = readPositiveInt(args.seed, 0x5eed);

for (let caseIndex = 0; caseIndex < cases; caseIndex++) {
  const nodeCount = 2 + randomInt(60);
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    const mode = i % 3 === 0 ? '3d' : '2d';
    nodes.push({
      id: 'n' + i,
      parent: i === 0 ? null : 'n' + randomInt(i),
      mode,
      local: mode === '3d' ? randomTransform3d() : randomTransform2d(),
      bounds: mode === '3d'
        ? { minX: -1, minY: -1, minZ: -1, maxX: 1, maxY: 1, maxZ: 1 }
        : { minX: -1, minY: -1, maxX: 1, maxY: 1 },
      visible: randomInt(5) !== 0
    });
  }

  const graph = createSceneGraph({ nodes });
  verify(graph);

  for (let step = 0; step < 20; step++) {
    const node = nodes[randomInt(nodes.length)];
    const field = node.mode === '3d'
      ? ['x', 'y', 'z', 'rotationX', 'rotationY', 'rotationZ'][randomInt(6)]
      : ['x', 'y', 'rotation'][randomInt(3)];
    const value = randomFloat(-20, 20);
    node.local[field] = value;
    graph.commit([[0, ['nodes', node.id, 'local', field], value]]);
    verify(graph);
  }
}

function verify(graph) {
  const snapshot = graph.serialize();
  for (const node of Object.values(snapshot.nodes)) {
    if (node.mode === '3d') {
      const expected = slowWorld3d(snapshot, node.id);
      const actual = graph.readWorldMatrix4(node.id);
      assert.ok(actual, node.id + ' missing matrix4');
      assertMatrixClose(actual, expected, node.id);
    } else {
      const expected = slowWorld2d(snapshot, node.id);
      const actual = graph.readWorld2d(node.id);
      assert.ok(actual, node.id + ' missing matrix2d');
      assertMatrixClose(actual, expected, node.id);
    }
  }
  const serialized = JSON.parse(JSON.stringify(snapshot));
  assert.strictEqual(serialized.kind, 'frontier.scene.graph');
}

function slowWorld2d(snapshot, id) {
  const node = snapshot.nodes[id];
  const local = local2d(node.local);
  const parent = node.parent ? snapshot.nodes[node.parent] : null;
  if (!parent || parent.mode !== '2d') return local;
  return multiply2d(slowWorld2d(snapshot, parent.id), local);
}

function slowWorld3d(snapshot, id) {
  const node = snapshot.nodes[id];
  const local = local3d(node.local);
  const parent = node.parent ? snapshot.nodes[node.parent] : null;
  if (!parent || parent.mode !== '3d') return local;
  return multiply4(slowWorld3d(snapshot, parent.id), local);
}

function local2d(transform = {}) {
  const x = finite(transform.x, 0);
  const y = finite(transform.y, 0);
  const rotation = finite(transform.rotation, 0);
  const scaleX = finite(transform.scaleX, 1);
  const scaleY = finite(transform.scaleY, 1);
  const a = Math.cos(rotation) * scaleX;
  const b = Math.sin(rotation) * scaleX;
  const c = -Math.sin(rotation) * scaleY;
  const d = Math.cos(rotation) * scaleY;
  return [a, b, c, d, x, y];
}

function multiply2d(left, right) {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5]
  ];
}

function local3d(transform = {}) {
  const out = new Array(16).fill(0);
  const x = finite(transform.x, 0);
  const y = finite(transform.y, 0);
  const z = finite(transform.z, 0);
  const scaleX = finite(transform.scaleX, 1);
  const scaleY = finite(transform.scaleY, 1);
  const scaleZ = finite(transform.scaleZ, 1);
  const rotationX = finite(transform.rotationX, 0) * 0.5;
  const rotationY = finite(transform.rotationY, 0) * 0.5;
  const rotationZ = finite(transform.rotationZ, 0) * 0.5;
  const sx = Math.sin(rotationX);
  const cx = Math.cos(rotationX);
  const sy = Math.sin(rotationY);
  const cy = Math.cos(rotationY);
  const sz = Math.sin(rotationZ);
  const cz = Math.cos(rotationZ);
  let qx = sx * cy * cz + cx * sy * sz;
  let qy = cx * sy * cz - sx * cy * sz;
  let qz = cx * cy * sz + sx * sy * cz;
  let qw = cx * cy * cz - sx * sy * sz;
  const length = Math.hypot(qx, qy, qz, qw) || 1;
  qx /= length;
  qy /= length;
  qz /= length;
  qw /= length;
  const xx = qx * qx;
  const xy = qx * qy;
  const xz = qx * qz;
  const yy = qy * qy;
  const yz = qy * qz;
  const zz = qz * qz;
  const wx = qw * qx;
  const wy = qw * qy;
  const wz = qw * qz;
  out[0] = (1 - 2 * (yy + zz)) * scaleX;
  out[1] = 2 * (xy + wz) * scaleX;
  out[2] = 2 * (xz - wy) * scaleX;
  out[4] = 2 * (xy - wz) * scaleY;
  out[5] = (1 - 2 * (xx + zz)) * scaleY;
  out[6] = 2 * (yz + wx) * scaleY;
  out[8] = 2 * (xz + wy) * scaleZ;
  out[9] = 2 * (yz - wx) * scaleZ;
  out[10] = (1 - 2 * (xx + yy)) * scaleZ;
  out[12] = x;
  out[13] = y;
  out[14] = z;
  out[15] = 1;
  return out;
}

function multiply4(left, right) {
  const out = new Array(16);
  for (let column = 0; column < 4; column++) {
    const r0 = right[column * 4];
    const r1 = right[column * 4 + 1];
    const r2 = right[column * 4 + 2];
    const r3 = right[column * 4 + 3];
    out[column * 4] = left[0] * r0 + left[4] * r1 + left[8] * r2 + left[12] * r3;
    out[column * 4 + 1] = left[1] * r0 + left[5] * r1 + left[9] * r2 + left[13] * r3;
    out[column * 4 + 2] = left[2] * r0 + left[6] * r1 + left[10] * r2 + left[14] * r3;
    out[column * 4 + 3] = left[3] * r0 + left[7] * r1 + left[11] * r2 + left[15] * r3;
  }
  return out;
}

function assertMatrixClose(actual, expected, label) {
  assert.strictEqual(actual.length, expected.length);
  for (let i = 0; i < actual.length; i++) {
    assert.ok(Math.abs(actual[i] - expected[i]) < 1e-8, label + ' matrix[' + i + '] expected ' + expected[i] + ' got ' + actual[i]);
  }
}

function randomTransform2d() {
  return {
    x: randomFloat(-50, 50),
    y: randomFloat(-50, 50),
    rotation: randomFloat(-Math.PI, Math.PI),
    scaleX: randomFloat(0.2, 3),
    scaleY: randomFloat(0.2, 3)
  };
}

function randomTransform3d() {
  return {
    x: randomFloat(-50, 50),
    y: randomFloat(-50, 50),
    z: randomFloat(-50, 50),
    rotationX: randomFloat(-Math.PI, Math.PI),
    rotationY: randomFloat(-Math.PI, Math.PI),
    rotationZ: randomFloat(-Math.PI, Math.PI),
    scaleX: randomFloat(0.2, 3),
    scaleY: randomFloat(0.2, 3),
    scaleZ: randomFloat(0.2, 3)
  };
}

function randomFloat(min, max) {
  return min + (nextRandom() / 0xffffffff) * (max - min);
}

function randomInt(max) {
  return Math.floor((nextRandom() / 0x100000000) * max);
}

function nextRandom() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed;
}

function finite(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--cases') out.cases = argv[++i];
    else if (arg === '--seed') out.seed = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node test/fuzz.mjs [--cases 300] [--seed 24301]');
      process.exit(0);
    } else {
      throw new Error('unknown argument: ' + arg);
    }
  }
  return out;
}

function readPositiveInt(value, fallback) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error('expected positive integer, got ' + value);
  return number;
}
