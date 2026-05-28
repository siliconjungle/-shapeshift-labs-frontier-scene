import type {
  FrontierSceneGraph,
  FrontierSceneSnapshot,
  FrontierSceneVirtualAabb3Item,
  FrontierSceneVirtualSpatialItem
} from '../dist/index.js';
import {
  createSceneGraph,
  sceneNode2d,
  sceneNode3d,
  scheduleSceneWorldUpdate
} from '../dist/index.js';

const graph: FrontierSceneGraph = createSceneGraph({
  nodes: [
    sceneNode2d('root', { local: { x: 1, y: 2 } }),
    sceneNode3d('camera', { local: { z: 5 } })
  ]
});

graph.commit([[0, ['nodes', 'root', 'local', 'x'], 2]], {
  origin: { actionId: 'typecheck.scene.move' }
});

const snapshot: FrontierSceneSnapshot = graph.serialize();
const twoD: FrontierSceneVirtualSpatialItem[] = graph.toVirtualSpatialItems();
const threeD: FrontierSceneVirtualAabb3Item[] = graph.toVirtualAabb3Items();

scheduleSceneWorldUpdate(graph, {
  scheduler: {
    schedule(task) {
      task.run?.({});
      return { id: 'scheduled' };
    }
  },
  onResult(result) {
    result.updated satisfies number;
  }
});

snapshot.kind satisfies 'frontier.scene.graph';
twoD.length satisfies number;
threeD.length satisfies number;
