import assert from 'node:assert';
import {
  createSceneGraph,
  createScenePatchEvent,
  sceneNode2d,
  sceneNode3d,
  scheduleSceneWorldUpdate
} from '../dist/index.js';

const graph = createSceneGraph({
  nodes: [
    sceneNode2d('root', {
      local: { x: 10, y: 20 },
      bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 }
    }),
    sceneNode2d('child', {
      parent: 'root',
      local: { x: 5, y: 7 },
      bounds: { minX: 0, minY: 0, maxX: 2, maxY: 2 },
      layer: 'ui'
    }),
    sceneNode3d('camera', {
      local: { x: 0, y: 2, z: 5, rotationY: Math.PI },
      bounds: { minX: -1, minY: -1, minZ: -1, maxX: 1, maxY: 1, maxZ: 1 }
    })
  ]
});

assert.strictEqual(graph.size, 3);
assert.deepStrictEqual(round(graph.readWorld2d('child')), [1, 0, 0, 1, 15, 27]);
assert.deepStrictEqual(graph.queryAabb2d({ minX: 14, minY: 26, maxX: 20, maxY: 32, layer: 'ui' }), ['child']);
assert.deepStrictEqual(graph.toVirtualSpatialItems({ minX: 0, minY: 0, maxX: 20, maxY: 40 }).map((item) => item.key), ['root', 'child']);

const cameraMatrix = graph.readWorldMatrix4('camera');
assert.ok(cameraMatrix);
assert.strictEqual(round([cameraMatrix[12], cameraMatrix[13], cameraMatrix[14]]).join(','), '0,2,5');
assert.deepStrictEqual(graph.queryFrustum3d({
  planes: [
    { x: 1, y: 0, z: 0, w: 10 },
    { x: -1, y: 0, z: 0, w: 10 },
    { x: 0, y: 1, z: 0, w: 10 },
    { x: 0, y: -1, z: 0, w: 10 },
    { x: 0, y: 0, z: 1, w: 10 },
    { x: 0, y: 0, z: -1, w: 10 }
  ]
}), ['camera']);

const commit = graph.commit([[0, ['nodes', 'root', 'local', 'x'], 20]], {
  origin: { actionId: 'scene.moveRoot', causeId: 'smoke' }
});
assert.strictEqual(commit.structural, false);
assert.deepStrictEqual(commit.dirtyNodeIds.sort(), ['child', 'root']);
assert.deepStrictEqual(round(graph.readWorld2d('child')), [1, 0, 0, 1, 25, 27]);

const event = createScenePatchEvent(graph, commit);
assert.strictEqual(event.kind, 'frontier.scene.patch');
assert.strictEqual(event.origin.actionId, 'scene.moveRoot');

const snapshot = graph.serialize();
const hydrated = createSceneGraph(snapshot);
assert.deepStrictEqual(round(hydrated.readWorld2d('child')), [1, 0, 0, 1, 25, 27]);

const structural = hydrated.commit([[0, ['nodes', 'hud'], {
  id: 'hud',
  parent: 'root',
  mode: '2d',
  local: { x: -5, y: -5 },
  bounds: { minX: 0, minY: 0, maxX: 3, maxY: 3 }
}]]);
assert.strictEqual(structural.structural, true);
assert.deepStrictEqual(round(hydrated.readWorld2d('hud')), [1, 0, 0, 1, 15, 15]);

{
  const forced = createSceneGraph({
    nodes: [
      sceneNode2d('force-root', {
        local: { x: 1, y: 1 },
        bounds: { minX: 0, minY: 0, maxX: 2, maxY: 2 }
      })
    ]
  });
  assert.deepStrictEqual(forced.queryAabb2d({ minX: 1, minY: 1, maxX: 3, maxY: 3 }), ['force-root']);
  forced.snapshot.nodes['force-root'].local.x = 20;
  forced.updateWorld({ force: true });
  assert.deepStrictEqual(forced.queryAabb2d({ minX: 20, minY: 1, maxX: 22, maxY: 3 }), ['force-root']);
}

{
  const scheduler = createFakeScheduler();
  let result;
  hydrated.commit([[0, ['nodes', 'hud', 'local', 'x'], 1]]);
  const task = scheduleSceneWorldUpdate(hydrated, {
    scheduler,
    autoRun: true,
    lane: 'frame',
    onResult(next) {
      result = next;
    }
  });
  assert.ok(task.id);
  assert.ok(result.updated >= 1);
}

assert.deepStrictEqual(hydrated.inspect().edges.find((edge) => edge.to === 'hud'), {
  from: 'root',
  to: 'hud',
  kind: 'parent'
});

function createFakeScheduler() {
  const tasks = [];
  return {
    schedule(task) {
      const scheduled = { ...task, id: task.id ?? 'task-' + tasks.length };
      tasks.push(scheduled);
      return {
        id: scheduled.id,
        cancel() {
          return false;
        }
      };
    },
    run() {
      while (tasks.length > 0) tasks.shift().run?.({});
      return {};
    }
  };
}

function round(values) {
  return Array.from(values, (value) => {
    const rounded = Math.round(value * 1000000) / 1000000;
    return Object.is(rounded, -0) ? 0 : rounded;
  });
}
