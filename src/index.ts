import {
  OP_ASSIGN,
  OP_REMOVE,
  OP_SET,
  applyPatch
} from '@shapeshift-labs/frontier';
import type { JsonPath, JsonValue, Patch } from '@shapeshift-labs/frontier';

export const FRONTIER_SCENE_GRAPH_KIND = 'frontier.scene.graph';
export const FRONTIER_SCENE_GRAPH_VERSION = 1;

const MODE_2D = 1;
const MODE_3D = 2;
const NO_INDEX = -1;
const INVALID_MIN = Number.POSITIVE_INFINITY;
const INVALID_MAX = Number.NEGATIVE_INFINITY;

export type FrontierSceneNodeId = string;
export type FrontierSceneDimension = '2d' | '3d';
export type FrontierSceneMatrix2D = [number, number, number, number, number, number];
export type FrontierSceneMatrix4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number
];

export interface FrontierSceneTransform2D {
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  skewX?: number;
  skewY?: number;
  originX?: number;
  originY?: number;
  matrix?: readonly number[];
}

export interface FrontierSceneTransform3D {
  x?: number;
  y?: number;
  z?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  qx?: number;
  qy?: number;
  qz?: number;
  qw?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  matrix?: readonly number[];
}

export interface FrontierSceneBounds2D {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface FrontierSceneBounds3D extends FrontierSceneBounds2D {
  minZ: number;
  maxZ: number;
}

export interface FrontierSceneNodeState {
  id: FrontierSceneNodeId;
  parent?: FrontierSceneNodeId | null;
  children?: FrontierSceneNodeId[];
  mode?: FrontierSceneDimension;
  local?: FrontierSceneTransform2D | FrontierSceneTransform3D;
  bounds?: FrontierSceneBounds2D | FrontierSceneBounds3D;
  visible?: boolean;
  layer?: string;
  userData?: JsonValue;
}

export interface FrontierSceneSnapshot {
  kind: typeof FRONTIER_SCENE_GRAPH_KIND;
  version: typeof FRONTIER_SCENE_GRAPH_VERSION;
  rootIds: FrontierSceneNodeId[];
  order: FrontierSceneNodeId[];
  nodes: Record<FrontierSceneNodeId, FrontierSceneNodeState>;
  metadata?: Record<string, JsonValue>;
}

export type FrontierSceneNodeInput = Omit<FrontierSceneNodeState, 'id'> & {
  id?: FrontierSceneNodeId;
};

export interface FrontierSceneGraphOptions {
  nodes?: readonly FrontierSceneNodeInput[] | Record<FrontierSceneNodeId, FrontierSceneNodeInput | FrontierSceneNodeState>;
  metadata?: Record<string, JsonValue>;
}

export type FrontierSceneGraphInput = FrontierSceneSnapshot | FrontierSceneGraphOptions;

export interface FrontierSceneOrigin {
  actionId?: string;
  causeId?: string;
  actor?: string;
  source?: string;
  metadata?: Record<string, JsonValue>;
}

export interface FrontierSceneCommitOptions {
  origin?: FrontierSceneOrigin;
}

export interface FrontierSceneCommitResult {
  changed: boolean;
  structural: boolean;
  patch: Patch;
  dirtyNodeIds: FrontierSceneNodeId[];
  origin?: FrontierSceneOrigin;
}

export interface FrontierSceneUpdateOptions {
  force?: boolean;
}

export interface FrontierSceneUpdateResult {
  updated: number;
  dirtyBefore: number;
  generation: number;
}

export interface FrontierSceneAabb2DQuery extends FrontierSceneBounds2D {
  layer?: string;
  includeInvisible?: boolean;
}

export interface FrontierSceneAabb3DQuery extends FrontierSceneBounds3D {
  layer?: string;
  includeInvisible?: boolean;
}

export interface FrontierSceneFrustumPlane {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface FrontierSceneFrustum {
  planes: readonly FrontierSceneFrustumPlane[];
  layer?: string;
  includeInvisible?: boolean;
}

export interface FrontierSceneVirtualSpatialItem {
  key: FrontierSceneNodeId;
  x: number;
  y: number;
  width: number;
  height: number;
  value: FrontierSceneNodeState;
}

export interface FrontierSceneVirtualAabb3Item {
  key: FrontierSceneNodeId;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  value: FrontierSceneNodeState;
}

export interface FrontierSceneInspectionNode {
  id: FrontierSceneNodeId;
  parent: FrontierSceneNodeId | null;
  mode: FrontierSceneDimension;
  visible: boolean;
  layer?: string;
  childCount: number;
  dirty: boolean;
}

export interface FrontierSceneInspectionEdge {
  from: FrontierSceneNodeId;
  to: FrontierSceneNodeId;
  kind: 'parent';
}

export interface FrontierSceneInspection {
  kind: 'frontier.scene.inspection';
  version: 1;
  generation: number;
  nodeCount: number;
  dirtyNodeIds: FrontierSceneNodeId[];
  nodes: FrontierSceneInspectionNode[];
  edges: FrontierSceneInspectionEdge[];
  lastCommit?: FrontierSceneCommitResult;
}

export interface FrontierScenePatchEvent {
  kind: 'frontier.scene.patch';
  version: 1;
  graph: FrontierSceneInspection;
  patch: Patch;
  dirtyNodeIds: FrontierSceneNodeId[];
  structural: boolean;
  origin?: FrontierSceneOrigin;
}

export interface FrontierSceneSchedulerTask {
  id?: string;
  type?: string;
  lane?: string;
  area?: string;
  priority?: number;
  units?: number;
  key?: string;
  causeId?: string;
  metadata?: Record<string, unknown>;
  run?: (context: unknown) => unknown;
}

export interface FrontierSceneScheduledTask {
  readonly id?: string;
  cancel?(reason?: string): boolean;
}

export interface FrontierSceneSchedulerLike {
  schedule(task: FrontierSceneSchedulerTask): FrontierSceneScheduledTask;
  run?(options?: { lane?: string }): unknown;
  requestRun?(options?: { lane?: string }): unknown;
}

export interface FrontierSceneScheduleOptions {
  scheduler: FrontierSceneSchedulerLike;
  id?: string;
  lane?: string;
  causeId?: string;
  key?: string;
  priority?: number;
  units?: number;
  autoRun?: boolean;
  requestFrame?: boolean;
  onResult?: (result: FrontierSceneUpdateResult) => void;
}

export interface FrontierSceneGraph {
  readonly snapshot: FrontierSceneSnapshot;
  readonly size: number;
  commit(patch: Patch, options?: FrontierSceneCommitOptions): FrontierSceneCommitResult;
  markDirty(id: FrontierSceneNodeId): boolean;
  updateWorld(options?: FrontierSceneUpdateOptions): FrontierSceneUpdateResult;
  readWorld2d(id: FrontierSceneNodeId, out?: number[]): FrontierSceneMatrix2D | null;
  readWorldMatrix4(id: FrontierSceneNodeId, out?: number[]): FrontierSceneMatrix4 | null;
  readWorldBounds2d(id: FrontierSceneNodeId, out?: Partial<FrontierSceneBounds2D>): FrontierSceneBounds2D | null;
  readWorldBounds3d(id: FrontierSceneNodeId, out?: Partial<FrontierSceneBounds3D>): FrontierSceneBounds3D | null;
  queryAabb2d(query: FrontierSceneAabb2DQuery): FrontierSceneNodeId[];
  queryAabb3d(query: FrontierSceneAabb3DQuery): FrontierSceneNodeId[];
  queryFrustum3d(frustum: FrontierSceneFrustum): FrontierSceneNodeId[];
  toVirtualSpatialItems(query?: FrontierSceneAabb2DQuery): FrontierSceneVirtualSpatialItem[];
  toVirtualAabb3Items(query?: FrontierSceneAabb3DQuery | FrontierSceneFrustum): FrontierSceneVirtualAabb3Item[];
  serialize(): FrontierSceneSnapshot;
  inspect(): FrontierSceneInspection;
}

interface SceneIndex {
  ids: FrontierSceneNodeId[];
  indices3d: number[];
  indexById: Map<FrontierSceneNodeId, number>;
  parent: Int32Array;
  firstChild: Int32Array;
  nextSibling: Int32Array;
  mode: Uint8Array;
  visible: Uint8Array;
  localDirty: Uint8Array;
  dirty: Uint8Array;
  boundsDirty: Uint8Array;
  boundsDirty2dCount: number;
  boundsDirty3dCount: number;
  dirtyList: number[];
  order: number[];
  local2d: Float64Array;
  world2d: Float64Array;
  local3d: Float64Array;
  world3d: Float64Array;
  worldBounds2d: Float64Array;
  worldBounds3d: Float64Array;
  generation: number;
}

export function createSceneGraph(input: FrontierSceneGraphInput = {}): FrontierSceneGraph {
  let snapshot = normalizeSceneSnapshot(input);
  let index = createEmptyIndex();
  let lastCommit: FrontierSceneCommitResult | undefined;
  rebuildIndex();

  const api: FrontierSceneGraph = {
    get snapshot() {
      return snapshot;
    },
    get size() {
      return index.ids.length;
    },
    commit(patch, options) {
      const analysis = analyzePatch(patch);
      const next = !analysis.structural && applySceneSetPatchFast(snapshot, patch)
        ? snapshot
        : applyPatch(snapshot as unknown as JsonValue, patch) as unknown as FrontierSceneSnapshot;
      snapshot = analysis.structural ? normalizeSceneSnapshot(next) : next;
      if (analysis.structural) {
        rebuildIndex();
      } else {
        for (const id of analysis.dirtyIds) {
          markLocalDirtyById(id);
          markDirtySubtreeById(id);
        }
      }
      const dirtyNodeIds = dirtyIds();
      lastCommit = {
        changed: patch.length > 0,
        structural: analysis.structural,
        patch,
        dirtyNodeIds,
        origin: options?.origin
      };
      return lastCommit;
    },
    markDirty(id) {
      markLocalDirtyById(id);
      return markDirtySubtreeById(id);
    },
    updateWorld(options) {
      if (options?.force) markAllDirty();
      const dirtyBefore = index.dirtyList.length;
      if (dirtyBefore === 0) return { updated: 0, dirtyBefore: 0, generation: index.generation };

      let updated = 0;
      if (dirtyBefore <= 256 && dirtyParentsAreClean(dirtyBefore)) {
        for (let i = 0; i < dirtyBefore; i++) {
          const nodeIndex = index.dirtyList[i];
          if (index.dirty[nodeIndex] === 0) continue;
          computeNodeWorld(nodeIndex);
          index.dirty[nodeIndex] = 0;
          updated++;
        }
      } else {
        for (let i = 0; i < index.order.length; i++) {
          const nodeIndex = index.order[i];
          if (index.dirty[nodeIndex] === 0) continue;
          computeNodeWorld(nodeIndex);
          index.dirty[nodeIndex] = 0;
          updated++;
        }
      }
      index.dirtyList.length = 0;
      index.generation++;
      return { updated, dirtyBefore, generation: index.generation };
    },
    readWorld2d(id, out = [0, 0, 0, 0, 0, 0]) {
      this.updateWorld();
      const nodeIndex = index.indexById.get(id);
      if (nodeIndex === undefined || index.mode[nodeIndex] !== MODE_2D) return null;
      copyArray(index.world2d, nodeIndex * 6, out, 6);
      return out as FrontierSceneMatrix2D;
    },
    readWorldMatrix4(id, out = new Array(16).fill(0)) {
      this.updateWorld();
      const nodeIndex = index.indexById.get(id);
      if (nodeIndex === undefined || index.mode[nodeIndex] !== MODE_3D) return null;
      copyArray(index.world3d, nodeIndex * 16, out, 16);
      return out as FrontierSceneMatrix4;
    },
    readWorldBounds2d(id, out = {}) {
      this.updateWorld();
      const nodeIndex = index.indexById.get(id);
      if (nodeIndex === undefined || index.mode[nodeIndex] !== MODE_2D) return null;
      ensureNodeWorldBounds(nodeIndex);
      const offset = nodeIndex * 4;
      if (!isValidBounds2d(index.worldBounds2d, offset)) return null;
      out.minX = index.worldBounds2d[offset];
      out.minY = index.worldBounds2d[offset + 1];
      out.maxX = index.worldBounds2d[offset + 2];
      out.maxY = index.worldBounds2d[offset + 3];
      return out as FrontierSceneBounds2D;
    },
    readWorldBounds3d(id, out = {}) {
      this.updateWorld();
      const nodeIndex = index.indexById.get(id);
      if (nodeIndex === undefined || index.mode[nodeIndex] !== MODE_3D) return null;
      ensureNodeWorldBounds(nodeIndex);
      const offset = nodeIndex * 6;
      if (!isValidBounds3d(index.worldBounds3d, offset)) return null;
      out.minX = index.worldBounds3d[offset];
      out.minY = index.worldBounds3d[offset + 1];
      out.minZ = index.worldBounds3d[offset + 2];
      out.maxX = index.worldBounds3d[offset + 3];
      out.maxY = index.worldBounds3d[offset + 4];
      out.maxZ = index.worldBounds3d[offset + 5];
      return out as FrontierSceneBounds3D;
    },
    queryAabb2d(query) {
      this.updateWorld();
      const out = new Array<FrontierSceneNodeId>(index.ids.length);
      let outLength = 0;
      if (index.boundsDirty2dCount === 0) {
        for (let i = 0; i < index.ids.length; i++) {
          if (index.mode[i] !== MODE_2D || !nodeMatchesQuery(i, query)) continue;
          const offset = i * 4;
          if (isValidBounds2d(index.worldBounds2d, offset) && intersects2d(index.worldBounds2d, offset, query)) out[outLength++] = index.ids[i];
        }
      } else {
        for (let i = 0; i < index.ids.length; i++) {
          if (index.mode[i] !== MODE_2D || !nodeMatchesQuery(i, query)) continue;
          const offset = i * 4;
          ensureNodeWorldBounds(i);
          if (isValidBounds2d(index.worldBounds2d, offset) && intersects2d(index.worldBounds2d, offset, query)) out[outLength++] = index.ids[i];
        }
      }
      out.length = outLength;
      return out;
    },
    queryAabb3d(query) {
      this.updateWorld();
      const indices = index.indices3d;
      const out = new Array<FrontierSceneNodeId>(indices.length);
      let outLength = 0;
      const includeInvisible = query.includeInvisible === true;
      const layer = query.layer;
      if (index.boundsDirty3dCount === 0) {
        for (let cursor = 0; cursor < indices.length; cursor++) {
          const i = indices[cursor];
          if (!includeInvisible && index.visible[i] === 0) continue;
          if (layer !== undefined && snapshot.nodes[index.ids[i]].layer !== layer) continue;
          const offset = i * 6;
          if (isValidBounds3d(index.worldBounds3d, offset) && intersects3d(index.worldBounds3d, offset, query)) out[outLength++] = index.ids[i];
        }
      } else {
        for (let cursor = 0; cursor < indices.length; cursor++) {
          const i = indices[cursor];
          if (!includeInvisible && index.visible[i] === 0) continue;
          if (layer !== undefined && snapshot.nodes[index.ids[i]].layer !== layer) continue;
          const offset = i * 6;
          ensureNodeWorldBounds(i);
          if (isValidBounds3d(index.worldBounds3d, offset) && intersects3d(index.worldBounds3d, offset, query)) out[outLength++] = index.ids[i];
        }
      }
      out.length = outLength;
      return out;
    },
    queryFrustum3d(frustum) {
      this.updateWorld();
      const planes = frustum.planes;
      const indices = index.indices3d;
      const out = new Array<FrontierSceneNodeId>(indices.length);
      let outLength = 0;
      const includeInvisible = frustum.includeInvisible === true;
      const layer = frustum.layer;
      if (index.boundsDirty3dCount === 0) {
        for (let cursor = 0; cursor < indices.length; cursor++) {
          const i = indices[cursor];
          if (!includeInvisible && index.visible[i] === 0) continue;
          if (layer !== undefined && snapshot.nodes[index.ids[i]].layer !== layer) continue;
          const offset = i * 6;
          if (isValidBounds3d(index.worldBounds3d, offset) && intersectsFrustum(index.worldBounds3d, offset, planes)) out[outLength++] = index.ids[i];
        }
      } else {
        for (let cursor = 0; cursor < indices.length; cursor++) {
          const i = indices[cursor];
          if (!includeInvisible && index.visible[i] === 0) continue;
          if (layer !== undefined && snapshot.nodes[index.ids[i]].layer !== layer) continue;
          const offset = i * 6;
          ensureNodeWorldBounds(i);
          if (isValidBounds3d(index.worldBounds3d, offset) && intersectsFrustum(index.worldBounds3d, offset, planes)) out[outLength++] = index.ids[i];
        }
      }
      out.length = outLength;
      return out;
    },
    toVirtualSpatialItems(query) {
      this.updateWorld();
      const out: FrontierSceneVirtualSpatialItem[] = [];
      const candidates = query ? new Set(this.queryAabb2d(query)) : null;
      for (let i = 0; i < index.ids.length; i++) {
        const id = index.ids[i];
        if (index.mode[i] !== MODE_2D || (candidates && !candidates.has(id)) || (!query && index.visible[i] === 0)) continue;
        const offset = i * 4;
        if (index.boundsDirty2dCount !== 0) ensureNodeWorldBounds(i);
        if (!isValidBounds2d(index.worldBounds2d, offset)) continue;
        const minX = index.worldBounds2d[offset];
        const minY = index.worldBounds2d[offset + 1];
        out.push({
          key: id,
          x: minX,
          y: minY,
          width: index.worldBounds2d[offset + 2] - minX,
          height: index.worldBounds2d[offset + 3] - minY,
          value: snapshot.nodes[id]
        });
      }
      return out;
    },
    toVirtualAabb3Items(query) {
      this.updateWorld();
      const candidateIds = query && 'planes' in query ? this.queryFrustum3d(query) : (query ? this.queryAabb3d(query) : null);
      const candidates = candidateIds ? new Set(candidateIds) : null;
      const out: FrontierSceneVirtualAabb3Item[] = [];
      const indices = index.indices3d;
      for (let cursor = 0; cursor < indices.length; cursor++) {
        const i = indices[cursor];
        const id = index.ids[i];
        if ((candidates && !candidates.has(id)) || (!query && index.visible[i] === 0)) continue;
        const offset = i * 6;
        if (index.boundsDirty3dCount !== 0) ensureNodeWorldBounds(i);
        if (!isValidBounds3d(index.worldBounds3d, offset)) continue;
        out.push({
          key: id,
          minX: index.worldBounds3d[offset],
          minY: index.worldBounds3d[offset + 1],
          minZ: index.worldBounds3d[offset + 2],
          maxX: index.worldBounds3d[offset + 3],
          maxY: index.worldBounds3d[offset + 4],
          maxZ: index.worldBounds3d[offset + 5],
          value: snapshot.nodes[id]
        });
      }
      return out;
    },
    serialize() {
      return cloneSceneSnapshot(snapshot);
    },
    inspect() {
      const nodes: FrontierSceneInspectionNode[] = [];
      const edges: FrontierSceneInspectionEdge[] = [];
      for (let i = 0; i < index.ids.length; i++) {
        const id = index.ids[i];
        const node = snapshot.nodes[id];
        const parentIndex = index.parent[i];
        const parentId = parentIndex === NO_INDEX ? null : index.ids[parentIndex];
        if (parentId) edges.push({ from: parentId, to: id, kind: 'parent' });
        nodes.push({
          id,
          parent: parentId,
          mode: index.mode[i] === MODE_3D ? '3d' : '2d',
          visible: index.visible[i] !== 0,
          layer: node.layer,
          childCount: node.children?.length ?? 0,
          dirty: index.dirty[i] !== 0
        });
      }
      return {
        kind: 'frontier.scene.inspection',
        version: 1,
        generation: index.generation,
        nodeCount: index.ids.length,
        dirtyNodeIds: dirtyIds(),
        nodes,
        edges,
        lastCommit
      };
    }
  };

  return api;

  function rebuildIndex(): void {
    snapshot = normalizeSceneSnapshot(snapshot);
    const seenIds = new Set<FrontierSceneNodeId>();
    const ids: FrontierSceneNodeId[] = [];
    for (const id of snapshot.order) {
      if (snapshot.nodes[id] && !seenIds.has(id)) {
        seenIds.add(id);
        ids.push(id);
      }
    }
    for (const id of Object.keys(snapshot.nodes)) {
      if (!seenIds.has(id)) {
        seenIds.add(id);
        ids.push(id);
      }
    }
    const length = ids.length;
    const indexById = new Map<FrontierSceneNodeId, number>();
    for (let i = 0; i < length; i++) indexById.set(ids[i], i);

    const parent = new Int32Array(length);
    const firstChild = new Int32Array(length);
    const nextSibling = new Int32Array(length);
    parent.fill(NO_INDEX);
    firstChild.fill(NO_INDEX);
    nextSibling.fill(NO_INDEX);

    for (let i = 0; i < length; i++) {
      const node = snapshot.nodes[ids[i]];
      const parentId = node.parent;
      const parentIndex = parentId ? indexById.get(parentId) : undefined;
      if (parentIndex !== undefined) parent[i] = parentIndex;
    }

    for (let i = 0; i < length; i++) {
      const id = ids[i];
      const children = snapshot.nodes[id].children ?? [];
      for (let j = children.length - 1; j >= 0; j--) {
        const childIndex = indexById.get(children[j]);
        if (childIndex === undefined) continue;
        nextSibling[childIndex] = firstChild[i];
        firstChild[i] = childIndex;
      }
    }

    const order = buildTopologicalOrder(ids, parent, firstChild, nextSibling);
    const mode = new Uint8Array(length);
    const visible = new Uint8Array(length);
    const localDirty = new Uint8Array(length);
    const dirty = new Uint8Array(length);
    const boundsDirty = new Uint8Array(length);
    const indices3d: number[] = [];
    let boundsDirty2dCount = 0;
    let boundsDirty3dCount = 0;
    for (let i = 0; i < length; i++) {
      const node = snapshot.nodes[ids[i]];
      mode[i] = node.mode === '3d' ? MODE_3D : MODE_2D;
      visible[i] = node.visible === false ? 0 : 1;
      localDirty[i] = 1;
      dirty[i] = 1;
      boundsDirty[i] = 1;
      if (mode[i] === MODE_3D) {
        indices3d[indices3d.length] = i;
        boundsDirty3dCount++;
      } else {
        boundsDirty2dCount++;
      }
    }

    index = {
      ids,
      indices3d,
      indexById,
      parent,
      firstChild,
      nextSibling,
      mode,
      visible,
      localDirty,
      dirty,
      boundsDirty,
      boundsDirty2dCount,
      boundsDirty3dCount,
      dirtyList: Array.from({ length }, (_, i) => i),
      order,
      local2d: new Float64Array(length * 6),
      world2d: new Float64Array(length * 6),
      local3d: new Float64Array(length * 16),
      world3d: new Float64Array(length * 16),
      worldBounds2d: createBoundsArray(length * 4, 4),
      worldBounds3d: createBoundsArray(length * 6, 6),
      generation: index.generation
    };
  }

  function computeNodeWorld(nodeIndex: number): void {
    const parentIndex = index.parent[nodeIndex];
    if (index.mode[nodeIndex] === MODE_3D) {
      const localOffset = nodeIndex * 16;
      const worldOffset = nodeIndex * 16;
      if (index.localDirty[nodeIndex] !== 0) {
        const node = snapshot.nodes[index.ids[nodeIndex]];
        writeLocal3d(node.local as FrontierSceneTransform3D | undefined, index.local3d, localOffset);
        index.localDirty[nodeIndex] = 0;
      }
      if (parentIndex !== NO_INDEX && index.mode[parentIndex] === MODE_3D) {
        multiplyMat4(index.world3d, parentIndex * 16, index.local3d, localOffset, index.world3d, worldOffset);
      } else {
        copyArray(index.local3d, localOffset, index.world3d, 16, worldOffset);
      }
    } else {
      const localOffset = nodeIndex * 6;
      const worldOffset = nodeIndex * 6;
      if (index.localDirty[nodeIndex] !== 0) {
        const node = snapshot.nodes[index.ids[nodeIndex]];
        writeLocal2d(node.local as FrontierSceneTransform2D | undefined, index.local2d, localOffset);
        index.localDirty[nodeIndex] = 0;
      }
      if (parentIndex !== NO_INDEX && index.mode[parentIndex] === MODE_2D) {
        multiplyMat2d(index.world2d, parentIndex * 6, index.local2d, localOffset, index.world2d, worldOffset);
      } else {
        copyArray(index.local2d, localOffset, index.world2d, 6, worldOffset);
      }
    }
    markBoundsDirty(nodeIndex);
  }

  function markLocalDirtyById(id: FrontierSceneNodeId): boolean {
    const nodeIndex = index.indexById.get(id);
    if (nodeIndex === undefined) return false;
    index.localDirty[nodeIndex] = 1;
    return true;
  }

  function ensureNodeWorldBounds(nodeIndex: number): void {
    if (index.boundsDirty[nodeIndex] === 0) return;
    const id = index.ids[nodeIndex];
    const node = snapshot.nodes[id];
    if (index.mode[nodeIndex] === MODE_3D) {
      const worldOffset = nodeIndex * 16;
      writeWorldBounds3d(node.bounds as FrontierSceneBounds3D | undefined, index.world3d, worldOffset, index.worldBounds3d, nodeIndex * 6);
    } else {
      const worldOffset = nodeIndex * 6;
      writeWorldBounds2d(node.bounds as FrontierSceneBounds2D | undefined, index.world2d, worldOffset, index.worldBounds2d, nodeIndex * 4);
    }
    index.boundsDirty[nodeIndex] = 0;
    if (index.mode[nodeIndex] === MODE_3D) index.boundsDirty3dCount--;
    else index.boundsDirty2dCount--;
  }

  function markBoundsDirty(nodeIndex: number): void {
    if (index.boundsDirty[nodeIndex] !== 0) return;
    index.boundsDirty[nodeIndex] = 1;
    if (index.mode[nodeIndex] === MODE_3D) index.boundsDirty3dCount++;
    else index.boundsDirty2dCount++;
  }

  function markDirtySubtreeById(id: FrontierSceneNodeId): boolean {
    const nodeIndex = index.indexById.get(id);
    if (nodeIndex === undefined) return false;
    markDirtySubtree(nodeIndex);
    return true;
  }

  function markDirtySubtree(rootIndex: number): void {
    const stack = [rootIndex];
    while (stack.length > 0) {
      const nodeIndex = stack.pop()!;
      if (index.dirty[nodeIndex] === 0) {
        index.dirty[nodeIndex] = 1;
        index.dirtyList.push(nodeIndex);
      }
      for (let child = index.firstChild[nodeIndex]; child !== NO_INDEX; child = index.nextSibling[child]) {
        stack.push(child);
      }
    }
  }

  function markAllDirty(): void {
    index.dirtyList.length = 0;
    index.boundsDirty2dCount = 0;
    index.boundsDirty3dCount = 0;
    for (let i = 0; i < index.ids.length; i++) {
      index.localDirty[i] = 1;
      index.dirty[i] = 1;
      index.boundsDirty[i] = 1;
      if (index.mode[i] === MODE_3D) index.boundsDirty3dCount++;
      else index.boundsDirty2dCount++;
      index.dirtyList.push(i);
    }
  }

  function dirtyIds(): FrontierSceneNodeId[] {
    const out: FrontierSceneNodeId[] = [];
    for (const nodeIndex of index.dirtyList) {
      if (index.dirty[nodeIndex] !== 0) out.push(index.ids[nodeIndex]);
    }
    return out;
  }

  function nodeMatchesQuery(nodeIndex: number, query: { layer?: string; includeInvisible?: boolean }): boolean {
    if (!query.includeInvisible && index.visible[nodeIndex] === 0) return false;
    if (query.layer !== undefined && snapshot.nodes[index.ids[nodeIndex]].layer !== query.layer) return false;
    return true;
  }

  function dirtyParentsAreClean(length: number): boolean {
    for (let i = 0; i < length; i++) {
      const parentIndex = index.parent[index.dirtyList[i]];
      if (parentIndex !== NO_INDEX && index.dirty[parentIndex] !== 0) return false;
    }
    return true;
  }
}

export function sceneNode2d(id: FrontierSceneNodeId, options: Omit<FrontierSceneNodeState, 'id' | 'mode'> = {}): FrontierSceneNodeState {
  return { ...options, id, mode: '2d' };
}

export function sceneNode3d(id: FrontierSceneNodeId, options: Omit<FrontierSceneNodeState, 'id' | 'mode'> = {}): FrontierSceneNodeState {
  return { ...options, id, mode: '3d' };
}

export function createScenePatchEvent(
  graph: FrontierSceneGraph,
  commit: FrontierSceneCommitResult,
  origin: FrontierSceneOrigin | undefined = commit.origin
): FrontierScenePatchEvent {
  return {
    kind: 'frontier.scene.patch',
    version: 1,
    graph: graph.inspect(),
    patch: commit.patch,
    dirtyNodeIds: commit.dirtyNodeIds,
    structural: commit.structural,
    origin
  };
}

export function scheduleSceneWorldUpdate(graph: FrontierSceneGraph, options: FrontierSceneScheduleOptions): FrontierSceneScheduledTask {
  const task = options.scheduler.schedule({
    id: options.id,
    type: 'frontier.scene.updateWorld',
    area: 'scene',
    lane: options.lane,
    priority: options.priority,
    units: options.units ?? Math.max(1, graph.inspect().dirtyNodeIds.length),
    key: options.key,
    causeId: options.causeId,
    metadata: {
      nodeCount: graph.size,
      dirtyNodeIds: graph.inspect().dirtyNodeIds
    },
    run() {
      const result = graph.updateWorld();
      options.onResult?.(result);
      return result;
    }
  });
  if (options.autoRun) {
    if (options.requestFrame && options.scheduler.requestRun) options.scheduler.requestRun({ lane: options.lane });
    else options.scheduler.run?.({ lane: options.lane });
  }
  return task;
}

function analyzePatch(patch: Patch): { structural: boolean; dirtyIds: FrontierSceneNodeId[] } {
  let structural = false;
  const dirty = new Set<FrontierSceneNodeId>();
  for (const operation of patch) {
    const path = operation[1] as JsonPath;
    if (path.length === 0) {
      structural = true;
      continue;
    }
    const root = path[0];
    if (root === 'rootIds' || root === 'order') {
      structural = true;
      continue;
    }
    if (root !== 'nodes') continue;
    if (path.length < 3) {
      structural = true;
      continue;
    }
    const id = String(path[1]);
    const field = path[2];
    const code = operation[0];
    if (field === 'parent' || field === 'children' || field === 'mode') {
      structural = true;
    } else if (code === OP_REMOVE && path.length <= 3) {
      structural = true;
    } else if ((code === OP_SET || code === OP_ASSIGN) && path.length === 3 && field !== 'local' && field !== 'bounds' && field !== 'visible') {
      structural = true;
    }
    dirty.add(id);
  }
  return { structural, dirtyIds: Array.from(dirty) };
}

function applySceneSetPatchFast(snapshot: FrontierSceneSnapshot, patch: Patch): boolean {
  for (let i = 0; i < patch.length; i++) {
    const operation = patch[i];
    const path = operation[1] as JsonPath;
    if (operation[0] !== OP_SET || path.length !== 4 || path[0] !== 'nodes') return false;
    const node = snapshot.nodes[String(path[1])];
    if (!node) return false;
    const target = (node as unknown as Record<string, unknown>)[String(path[2])];
    if (!isRecord(target)) return false;
  }
  for (let i = 0; i < patch.length; i++) {
    const operation = patch[i];
    const path = operation[1] as JsonPath;
    const node = snapshot.nodes[String(path[1])] as unknown as Record<string, Record<string, JsonValue>>;
    node[String(path[2])][path[3]] = operation[2];
  }
  return true;
}

function normalizeSceneSnapshot(input: FrontierSceneGraphInput | FrontierSceneSnapshot): FrontierSceneSnapshot {
  if (isSceneSnapshot(input)) return normalizeSnapshotNodes(input);
  const nodes = normalizeInputNodes(input.nodes);
  return finalizeNormalizedNodes(nodes, Object.keys(nodes), input.metadata ? { ...input.metadata } : undefined);
}

function normalizeInputNodes(
  input: FrontierSceneGraphOptions['nodes']
): Record<FrontierSceneNodeId, FrontierSceneNodeState> {
  const nodes: Record<FrontierSceneNodeId, FrontierSceneNodeState> = {};
  if (!input) return nodes;
  if (Array.isArray(input)) {
    for (let i = 0; i < input.length; i++) {
      const node = normalizeNode(input[i], input[i].id ?? String(i));
      nodes[node.id] = node;
    }
  } else {
    for (const [id, value] of Object.entries(input)) {
      const node = normalizeNode(value, value.id ?? id);
      nodes[node.id] = node;
    }
  }
  for (const node of Object.values(nodes)) {
    for (const childId of node.children ?? []) {
      const child = nodes[childId];
      if (child && child.parent == null) child.parent = node.id;
    }
  }
  return nodes;
}

function normalizeSnapshotNodes(snapshot: FrontierSceneSnapshot): FrontierSceneSnapshot {
  const nodes: Record<FrontierSceneNodeId, FrontierSceneNodeState> = {};
  const rawNodes = isRecord(snapshot.nodes) ? snapshot.nodes : {};
  for (const [id, value] of Object.entries(rawNodes)) {
    const node = normalizeNode(value, id);
    nodes[node.id] = node;
  }
  return finalizeNormalizedNodes(nodes, snapshot.order, snapshot.metadata ? { ...snapshot.metadata } : undefined);
}

function finalizeNormalizedNodes(
  nodes: Record<FrontierSceneNodeId, FrontierSceneNodeState>,
  order: readonly FrontierSceneNodeId[] | undefined,
  metadata?: Record<string, JsonValue>
): FrontierSceneSnapshot {
  const ids = Object.keys(nodes);
  for (let i = 0; i < ids.length; i++) nodes[ids[i]].children = [];
  const rootIds: FrontierSceneNodeId[] = [];
  for (let i = 0; i < ids.length; i++) {
    const node = nodes[ids[i]];
    const parentId = node.parent;
    if (parentId && parentId !== node.id && nodes[parentId]) {
      nodes[parentId].children!.push(node.id);
    } else {
      node.parent = null;
      rootIds.push(node.id);
    }
  }
  const seenOrder = new Set<FrontierSceneNodeId>();
  const preferred: FrontierSceneNodeId[] = [];
  if (Array.isArray(order)) {
    for (const id of order) {
      if (nodes[id] && !seenOrder.has(id)) {
        seenOrder.add(id);
        preferred.push(id);
      }
    }
  }
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (!seenOrder.has(id)) {
      seenOrder.add(id);
      preferred.push(id);
    }
  }
  return {
    kind: FRONTIER_SCENE_GRAPH_KIND,
    version: FRONTIER_SCENE_GRAPH_VERSION,
    rootIds,
    order: preferred,
    nodes,
    metadata
  };
}

function normalizeNode(value: FrontierSceneNodeInput | FrontierSceneNodeState | unknown, fallbackId: string): FrontierSceneNodeState {
  const raw = isRecord(value) ? value as Partial<FrontierSceneNodeState> : {};
  const id = typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : fallbackId;
  const mode = raw.mode === '3d' ? '3d' : '2d';
  return {
    id,
    parent: typeof raw.parent === 'string' ? raw.parent : null,
    children: Array.isArray(raw.children) ? raw.children.filter((child): child is string => typeof child === 'string') : [],
    mode,
    local: isRecord(raw.local) ? { ...raw.local } as FrontierSceneTransform2D | FrontierSceneTransform3D : undefined,
    bounds: isRecord(raw.bounds) ? { ...raw.bounds } as FrontierSceneBounds2D | FrontierSceneBounds3D : undefined,
    visible: raw.visible === false ? false : true,
    layer: typeof raw.layer === 'string' ? raw.layer : undefined,
    userData: raw.userData
  };
}

function isSceneSnapshot(input: unknown): input is FrontierSceneSnapshot {
  return isRecord(input) && input.kind === FRONTIER_SCENE_GRAPH_KIND && isRecord(input.nodes);
}

function cloneSceneSnapshot(snapshot: FrontierSceneSnapshot): FrontierSceneSnapshot {
  const nodes: Record<FrontierSceneNodeId, FrontierSceneNodeState> = {};
  for (const [id, node] of Object.entries(snapshot.nodes)) {
    nodes[id] = {
      ...node,
      children: node.children ? node.children.slice() : [],
      local: node.local ? { ...node.local } : undefined,
      bounds: node.bounds ? { ...node.bounds } : undefined,
      userData: cloneJsonValue(node.userData)
    };
  }
  return {
    kind: FRONTIER_SCENE_GRAPH_KIND,
    version: FRONTIER_SCENE_GRAPH_VERSION,
    rootIds: snapshot.rootIds.slice(),
    order: snapshot.order.slice(),
    nodes,
    metadata: snapshot.metadata ? { ...snapshot.metadata } : undefined
  };
}

function cloneJsonValue<T extends JsonValue | undefined>(value: T): T {
  if (value === undefined || value === null || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function createEmptyIndex(): SceneIndex {
  return {
    ids: [],
    indices3d: [],
    indexById: new Map(),
    parent: new Int32Array(0),
    firstChild: new Int32Array(0),
    nextSibling: new Int32Array(0),
    mode: new Uint8Array(0),
    visible: new Uint8Array(0),
    localDirty: new Uint8Array(0),
    dirty: new Uint8Array(0),
    boundsDirty: new Uint8Array(0),
    boundsDirty2dCount: 0,
    boundsDirty3dCount: 0,
    dirtyList: [],
    order: [],
    local2d: new Float64Array(0),
    world2d: new Float64Array(0),
    local3d: new Float64Array(0),
    world3d: new Float64Array(0),
    worldBounds2d: new Float64Array(0),
    worldBounds3d: new Float64Array(0),
    generation: 0
  };
}

function buildTopologicalOrder(
  ids: FrontierSceneNodeId[],
  parent: Int32Array,
  firstChild: Int32Array,
  nextSibling: Int32Array
): number[] {
  const state = new Uint8Array(ids.length);
  const order: number[] = [];
  for (let i = 0; i < ids.length; i++) {
    if (parent[i] === NO_INDEX && state[i] === 0) visit(i);
  }
  for (let i = 0; i < ids.length; i++) {
    if (state[i] === 0) visit(i);
  }
  return order;

  function visit(nodeIndex: number): void {
    if (state[nodeIndex] === 1) throw new Error('frontier-scene hierarchy contains a cycle at node ' + ids[nodeIndex]);
    if (state[nodeIndex] === 2) return;
    state[nodeIndex] = 1;
    order.push(nodeIndex);
    for (let child = firstChild[nodeIndex]; child !== NO_INDEX; child = nextSibling[child]) visit(child);
    state[nodeIndex] = 2;
  }
}

function writeLocal2d(transform: FrontierSceneTransform2D | undefined, out: Float64Array, offset: number): void {
  const matrix = transform?.matrix;
  if (matrix && matrix.length >= 6) {
    for (let i = 0; i < 6; i++) out[offset + i] = readNumber(matrix[i], i === 0 || i === 3 ? 1 : 0);
    return;
  }
  const x = readNumber(transform?.x, 0);
  const y = readNumber(transform?.y, 0);
  const rotation = readNumber(transform?.rotation, 0);
  const scaleX = readNumber(transform?.scaleX, 1);
  const scaleY = readNumber(transform?.scaleY, 1);
  const skewX = readNumber(transform?.skewX, 0);
  const skewY = readNumber(transform?.skewY, 0);
  const originX = readNumber(transform?.originX, 0);
  const originY = readNumber(transform?.originY, 0);
  const a = Math.cos(rotation + skewY) * scaleX;
  const b = Math.sin(rotation + skewY) * scaleX;
  const c = -Math.sin(rotation - skewX) * scaleY;
  const d = Math.cos(rotation - skewX) * scaleY;
  out[offset] = a;
  out[offset + 1] = b;
  out[offset + 2] = c;
  out[offset + 3] = d;
  out[offset + 4] = x - originX * a - originY * c;
  out[offset + 5] = y - originX * b - originY * d;
}

function multiplyMat2d(left: Float64Array, leftOffset: number, right: Float64Array, rightOffset: number, out: Float64Array, outOffset: number): void {
  const la = left[leftOffset];
  const lb = left[leftOffset + 1];
  const lc = left[leftOffset + 2];
  const ld = left[leftOffset + 3];
  const ltx = left[leftOffset + 4];
  const lty = left[leftOffset + 5];
  const ra = right[rightOffset];
  const rb = right[rightOffset + 1];
  const rc = right[rightOffset + 2];
  const rd = right[rightOffset + 3];
  const rtx = right[rightOffset + 4];
  const rty = right[rightOffset + 5];
  out[outOffset] = la * ra + lc * rb;
  out[outOffset + 1] = lb * ra + ld * rb;
  out[outOffset + 2] = la * rc + lc * rd;
  out[outOffset + 3] = lb * rc + ld * rd;
  out[outOffset + 4] = la * rtx + lc * rty + ltx;
  out[outOffset + 5] = lb * rtx + ld * rty + lty;
}

function writeLocal3d(transform: FrontierSceneTransform3D | undefined, out: Float64Array, offset: number): void {
  const matrix = transform?.matrix;
  if (matrix && matrix.length >= 16) {
    for (let i = 0; i < 16; i++) out[offset + i] = readNumber(matrix[i], i % 5 === 0 ? 1 : 0);
    return;
  }
  const x = readNumber(transform?.x, 0);
  const y = readNumber(transform?.y, 0);
  const z = readNumber(transform?.z, 0);
  const scaleX = readNumber(transform?.scaleX, 1);
  const scaleY = readNumber(transform?.scaleY, 1);
  const scaleZ = readNumber(transform?.scaleZ, 1);
  const q = readQuaternion(transform);
  const qx = q[0];
  const qy = q[1];
  const qz = q[2];
  const qw = q[3];
  const xx = qx * qx;
  const xy = qx * qy;
  const xz = qx * qz;
  const yy = qy * qy;
  const yz = qy * qz;
  const zz = qz * qz;
  const wx = qw * qx;
  const wy = qw * qy;
  const wz = qw * qz;
  out[offset] = (1 - 2 * (yy + zz)) * scaleX;
  out[offset + 1] = 2 * (xy + wz) * scaleX;
  out[offset + 2] = 2 * (xz - wy) * scaleX;
  out[offset + 3] = 0;
  out[offset + 4] = 2 * (xy - wz) * scaleY;
  out[offset + 5] = (1 - 2 * (xx + zz)) * scaleY;
  out[offset + 6] = 2 * (yz + wx) * scaleY;
  out[offset + 7] = 0;
  out[offset + 8] = 2 * (xz + wy) * scaleZ;
  out[offset + 9] = 2 * (yz - wx) * scaleZ;
  out[offset + 10] = (1 - 2 * (xx + yy)) * scaleZ;
  out[offset + 11] = 0;
  out[offset + 12] = x;
  out[offset + 13] = y;
  out[offset + 14] = z;
  out[offset + 15] = 1;
}

function readQuaternion(transform: FrontierSceneTransform3D | undefined): [number, number, number, number] {
  if (
    isFiniteNumber(transform?.qx) &&
    isFiniteNumber(transform?.qy) &&
    isFiniteNumber(transform?.qz) &&
    isFiniteNumber(transform?.qw)
  ) {
    return normalizeQuaternion(transform!.qx!, transform!.qy!, transform!.qz!, transform!.qw!);
  }
  const x = readNumber(transform?.rotationX, 0) * 0.5;
  const y = readNumber(transform?.rotationY, 0) * 0.5;
  const z = readNumber(transform?.rotationZ, 0) * 0.5;
  const sx = Math.sin(x);
  const cx = Math.cos(x);
  const sy = Math.sin(y);
  const cy = Math.cos(y);
  const sz = Math.sin(z);
  const cz = Math.cos(z);
  return normalizeQuaternion(
    sx * cy * cz + cx * sy * sz,
    cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
    cx * cy * cz - sx * sy * sz
  );
}

function normalizeQuaternion(x: number, y: number, z: number, w: number): [number, number, number, number] {
  const length = Math.hypot(x, y, z, w);
  if (!Number.isFinite(length) || length <= 0) return [0, 0, 0, 1];
  const inv = 1 / length;
  return [x * inv, y * inv, z * inv, w * inv];
}

function multiplyMat4(left: Float64Array, leftOffset: number, right: Float64Array, rightOffset: number, out: Float64Array, outOffset: number): void {
  for (let column = 0; column < 4; column++) {
    const r0 = right[rightOffset + column * 4];
    const r1 = right[rightOffset + column * 4 + 1];
    const r2 = right[rightOffset + column * 4 + 2];
    const r3 = right[rightOffset + column * 4 + 3];
    out[outOffset + column * 4] = left[leftOffset] * r0 + left[leftOffset + 4] * r1 + left[leftOffset + 8] * r2 + left[leftOffset + 12] * r3;
    out[outOffset + column * 4 + 1] = left[leftOffset + 1] * r0 + left[leftOffset + 5] * r1 + left[leftOffset + 9] * r2 + left[leftOffset + 13] * r3;
    out[outOffset + column * 4 + 2] = left[leftOffset + 2] * r0 + left[leftOffset + 6] * r1 + left[leftOffset + 10] * r2 + left[leftOffset + 14] * r3;
    out[outOffset + column * 4 + 3] = left[leftOffset + 3] * r0 + left[leftOffset + 7] * r1 + left[leftOffset + 11] * r2 + left[leftOffset + 15] * r3;
  }
}

function writeWorldBounds2d(bounds: FrontierSceneBounds2D | undefined, matrix: Float64Array, matrixOffset: number, out: Float64Array, outOffset: number): void {
  if (!isBounds2d(bounds)) {
    writeInvalidBounds(out, outOffset, 4);
    return;
  }
  const minX = bounds.minX;
  const minY = bounds.minY;
  const maxX = bounds.maxX;
  const maxY = bounds.maxY;
  let worldMinX = INVALID_MIN;
  let worldMinY = INVALID_MIN;
  let worldMaxX = INVALID_MAX;
  let worldMaxY = INVALID_MAX;
  for (let i = 0; i < 4; i++) {
    const x = i === 0 || i === 3 ? minX : maxX;
    const y = i < 2 ? minY : maxY;
    const tx = matrix[matrixOffset] * x + matrix[matrixOffset + 2] * y + matrix[matrixOffset + 4];
    const ty = matrix[matrixOffset + 1] * x + matrix[matrixOffset + 3] * y + matrix[matrixOffset + 5];
    if (tx < worldMinX) worldMinX = tx;
    if (ty < worldMinY) worldMinY = ty;
    if (tx > worldMaxX) worldMaxX = tx;
    if (ty > worldMaxY) worldMaxY = ty;
  }
  out[outOffset] = worldMinX;
  out[outOffset + 1] = worldMinY;
  out[outOffset + 2] = worldMaxX;
  out[outOffset + 3] = worldMaxY;
}

function writeWorldBounds3d(bounds: FrontierSceneBounds3D | undefined, matrix: Float64Array, matrixOffset: number, out: Float64Array, outOffset: number): void {
  if (!isBounds3d(bounds)) {
    writeInvalidBounds(out, outOffset, 6);
    return;
  }
  let worldMinX = INVALID_MIN;
  let worldMinY = INVALID_MIN;
  let worldMinZ = INVALID_MIN;
  let worldMaxX = INVALID_MAX;
  let worldMaxY = INVALID_MAX;
  let worldMaxZ = INVALID_MAX;
  for (let ix = 0; ix < 2; ix++) {
    const x = ix === 0 ? bounds.minX : bounds.maxX;
    for (let iy = 0; iy < 2; iy++) {
      const y = iy === 0 ? bounds.minY : bounds.maxY;
      for (let iz = 0; iz < 2; iz++) {
        const z = iz === 0 ? bounds.minZ : bounds.maxZ;
        const tx = matrix[matrixOffset] * x + matrix[matrixOffset + 4] * y + matrix[matrixOffset + 8] * z + matrix[matrixOffset + 12];
        const ty = matrix[matrixOffset + 1] * x + matrix[matrixOffset + 5] * y + matrix[matrixOffset + 9] * z + matrix[matrixOffset + 13];
        const tz = matrix[matrixOffset + 2] * x + matrix[matrixOffset + 6] * y + matrix[matrixOffset + 10] * z + matrix[matrixOffset + 14];
        if (tx < worldMinX) worldMinX = tx;
        if (ty < worldMinY) worldMinY = ty;
        if (tz < worldMinZ) worldMinZ = tz;
        if (tx > worldMaxX) worldMaxX = tx;
        if (ty > worldMaxY) worldMaxY = ty;
        if (tz > worldMaxZ) worldMaxZ = tz;
      }
    }
  }
  out[outOffset] = worldMinX;
  out[outOffset + 1] = worldMinY;
  out[outOffset + 2] = worldMinZ;
  out[outOffset + 3] = worldMaxX;
  out[outOffset + 4] = worldMaxY;
  out[outOffset + 5] = worldMaxZ;
}

function intersects2d(values: Float64Array, offset: number, query: FrontierSceneBounds2D): boolean {
  return values[offset] <= query.maxX &&
    values[offset + 2] >= query.minX &&
    values[offset + 1] <= query.maxY &&
    values[offset + 3] >= query.minY;
}

function intersects3d(values: Float64Array, offset: number, query: FrontierSceneBounds3D): boolean {
  return values[offset] <= query.maxX &&
    values[offset + 3] >= query.minX &&
    values[offset + 1] <= query.maxY &&
    values[offset + 4] >= query.minY &&
    values[offset + 2] <= query.maxZ &&
    values[offset + 5] >= query.minZ;
}

function intersectsFrustum(values: Float64Array, offset: number, planes: readonly FrontierSceneFrustumPlane[]): boolean {
  const minX = values[offset];
  const minY = values[offset + 1];
  const minZ = values[offset + 2];
  const maxX = values[offset + 3];
  const maxY = values[offset + 4];
  const maxZ = values[offset + 5];
  for (let i = 0; i < planes.length; i++) {
    const plane = planes[i];
    const x = plane.x >= 0 ? maxX : minX;
    const y = plane.y >= 0 ? maxY : minY;
    const z = plane.z >= 0 ? maxZ : minZ;
    if (plane.x * x + plane.y * y + plane.z * z + plane.w < 0) return false;
  }
  return true;
}

function createBoundsArray(length: number, stride: 4 | 6): Float64Array {
  const out = new Float64Array(length);
  for (let i = 0; i < length; i += stride) {
    writeInvalidBounds(out, i, stride);
  }
  return out;
}

function writeInvalidBounds(out: Float64Array, offset: number, length: 4 | 6): void {
  out[offset] = INVALID_MIN;
  out[offset + 1] = INVALID_MIN;
  if (length === 6) {
    out[offset + 2] = INVALID_MIN;
    out[offset + 3] = INVALID_MAX;
    out[offset + 4] = INVALID_MAX;
    out[offset + 5] = INVALID_MAX;
  } else {
    out[offset + 2] = INVALID_MAX;
    out[offset + 3] = INVALID_MAX;
  }
}

function isValidBounds2d(values: Float64Array, offset: number): boolean {
  return values[offset] <= values[offset + 2] && values[offset + 1] <= values[offset + 3];
}

function isValidBounds3d(values: Float64Array, offset: number): boolean {
  return values[offset] <= values[offset + 3] && values[offset + 1] <= values[offset + 4] && values[offset + 2] <= values[offset + 5];
}

function isBounds2d(value: unknown): value is FrontierSceneBounds2D {
  return isRecord(value) &&
    isFiniteNumber(value.minX) &&
    isFiniteNumber(value.minY) &&
    isFiniteNumber(value.maxX) &&
    isFiniteNumber(value.maxY);
}

function isBounds3d(value: unknown): value is FrontierSceneBounds3D {
  return isBounds2d(value) && isFiniteNumber((value as FrontierSceneBounds3D).minZ) && isFiniteNumber((value as FrontierSceneBounds3D).maxZ);
}

function copyArray(source: ArrayLike<number>, sourceOffset: number, target: ArrayLike<number> & { [index: number]: number }, length: number, targetOffset = 0): void {
  for (let i = 0; i < length; i++) target[targetOffset + i] = source[sourceOffset + i];
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}
