import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createSceneGraph } from '../dist/index.js';

const args = parseArgs(process.argv.slice(2));
const outPath = args.out ? path.resolve(args.out) : null;
const nodeCount = readPositiveInt(args.nodes, 10000);
const iterations = readPositiveInt(args.iterations, 80);

const rows = [];
const results = [];

bench('scene:create-10k-mixed', () => {
  createSceneGraph({ nodes: createNodes(nodeCount) });
}, Math.max(8, Math.floor(iterations / 4)));

{
  const graph = createSceneGraph({ nodes: createNodes(nodeCount) });
  graph.updateWorld({ force: true });
  let cursor = 1;
  bench('scene:patch-update-2d-leaf', () => {
    const id = 'n' + (cursor++ % nodeCount);
    graph.commit([[0, ['nodes', id, 'local', 'x'], cursor]]);
    graph.updateWorld();
  }, iterations);
}

{
  const graph = createSceneGraph({ nodes: createNodes(nodeCount) });
  graph.updateWorld({ force: true });
  let cursor = 3;
  bench('scene:patch-update-3d-leaf', () => {
    cursor += 3;
    const id = 'n' + (cursor % nodeCount);
    graph.commit([[0, ['nodes', id, 'local', 'z'], cursor]]);
    graph.updateWorld();
  }, iterations);
}

{
  const graph = createSceneGraph({ nodes: createNodes(nodeCount) });
  graph.updateWorld({ force: true });
  let cursor = 0;
  bench('scene:batch-128-patches-update', () => {
    const patch = [];
    for (let i = 0; i < 128; i++) {
      cursor = (cursor + 17) % nodeCount;
      patch.push([0, ['nodes', 'n' + cursor, 'local', cursor % 4 === 0 ? 'y' : 'x'], cursor + i]);
    }
    graph.commit(patch);
    graph.updateWorld();
  }, iterations);
}

{
  const graph = createSceneGraph({ nodes: createNodes(nodeCount) });
  graph.updateWorld({ force: true });
  bench('scene:cull-2d-aabb', () => {
    graph.queryAabb2d({ minX: -200, minY: -200, maxX: 600, maxY: 600 });
  }, iterations);
  bench('scene:cull-3d-frustum', () => {
    graph.queryFrustum3d({
      planes: [
        { x: 1, y: 0, z: 0, w: 500 },
        { x: -1, y: 0, z: 0, w: 500 },
        { x: 0, y: 1, z: 0, w: 500 },
        { x: 0, y: -1, z: 0, w: 500 },
        { x: 0, y: 0, z: 1, w: 500 },
        { x: 0, y: 0, z: -1, w: 500 }
      ]
    });
  }, iterations);
  bench('scene:serialize-rehydrate', () => {
    createSceneGraph(graph.serialize());
  }, Math.max(8, Math.floor(iterations / 4)));
}

for (const row of rows) {
  console.log(`${row.name}: ${row.hz.toFixed(0)} ops/sec (${row.meanMs.toFixed(4)} ms/op, p95 ${row.p95Ms.toFixed(4)} ms)`);
}

if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    nodeCount,
    iterations,
    results
  }, null, 2) + '\n');
}

function bench(name, fn, count) {
  if (global.gc) global.gc();
  for (let i = 0; i < 5; i++) fn();
  const samples = [];
  for (let i = 0; i < count; i++) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const total = samples.reduce((sum, value) => sum + value, 0);
  const meanMs = total / samples.length;
  const p95Ms = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))];
  const hz = 1000 / meanMs;
  const row = { name, count, meanMs, p95Ms, hz };
  rows.push(row);
  results.push(row);
}

function createNodes(count) {
  const nodes = new Array(count);
  for (let i = 0; i < count; i++) {
    const mode = i % 4 === 0 ? '3d' : '2d';
    const parent = i === 0 ? null : 'n' + Math.floor((i - 1) / 2);
    nodes[i] = {
      id: 'n' + i,
      parent,
      mode,
      local: mode === '3d'
        ? { x: i % 97, y: i % 53, z: i % 31, rotationY: (i % 360) * Math.PI / 180, scaleX: 1, scaleY: 1, scaleZ: 1 }
        : { x: i % 97, y: i % 53, rotation: (i % 360) * Math.PI / 180, scaleX: 1, scaleY: 1 },
      bounds: mode === '3d'
        ? { minX: -1, minY: -1, minZ: -1, maxX: 1, maxY: 1, maxZ: 1 }
        : { minX: -1, minY: -1, maxX: 1, maxY: 1 },
      visible: true
    };
  }
  return nodes;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') out.out = argv[++i];
    else if (arg === '--nodes') out.nodes = argv[++i];
    else if (arg === '--iterations' || arg === '--rounds') out.iterations = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node benchmarks/package-bench.mjs [--nodes 10000] [--iterations 80|--rounds 80] [--out file.json]');
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
