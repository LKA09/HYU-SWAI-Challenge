import type { CriteriaWeights } from "@/src/types/ahp";
import type { LatLngPoint } from "@/src/types/geo";
import type {
  MobilityMode,
  RouteRequest,
  RouteResponse,
  RouteResponseRoute,
  RouteType,
} from "@/src/types/route";

type CompactEdge = {
  i: number;
  s: number;
  t: number;
  l: number;
  sm: number;
  sx: number;
  cw: number;
  fc: number;
  st: boolean;
  wa: boolean;
  wh: boolean;
  wk: boolean;
  sr: boolean;
  wo: boolean;
  o: "F" | "T" | "B" | string;
  c: [number, number][];
};

type CompactNetwork = {
  version: 1;
  edges: CompactEdge[];
};

type GraphEdge = {
  to: number;
  edgeId: number;
  lengthM: number;
  slopeMean: number;
  slopeMax: number;
  crosswalkEstimate: number;
  facilityEstimate: number;
  isSteps: boolean;
  coordinates: [number, number][];
};

type RouteSearchResult = {
  nodePath: number[];
  edges: GraphEdge[];
  cost: number;
};

type NetworkGraph = {
  adjacency: Map<number, GraphEdge[]>;
  nodeCoordinates: Map<number, LatLngPoint>;
  spatialIndex: Map<string, number[]>;
};

const NETWORK_URL = "/gis/processed_network/network.compact.json";
const GRID_SIZE_DEGREES = 0.003;
let networkPromise: Promise<CompactNetwork> | null = null;
const graphCache = new Map<MobilityMode, NetworkGraph>();

class PriorityQueue<T> {
  private heap: Array<{ item: T; priority: number }> = [];

  get size() {
    return this.heap.length;
  }

  push(item: T, priority: number) {
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): { item: T; priority: number } | null {
    const first = this.heap[0];
    const last = this.heap.pop();

    if (!first) {
      return null;
    }

    if (last && this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }

    return first;
  }

  private bubbleUp(index: number) {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.heap[parent].priority <= this.heap[current].priority) {
        break;
      }
      [this.heap[parent], this.heap[current]] = [this.heap[current], this.heap[parent]];
      current = parent;
    }
  }

  private bubbleDown(index: number) {
    let current = index;
    while (true) {
      const left = current * 2 + 1;
      const right = current * 2 + 2;
      let smallest = current;

      if (
        left < this.heap.length &&
        this.heap[left].priority < this.heap[smallest].priority
      ) {
        smallest = left;
      }

      if (
        right < this.heap.length &&
        this.heap[right].priority < this.heap[smallest].priority
      ) {
        smallest = right;
      }

      if (smallest === current) {
        break;
      }

      [this.heap[current], this.heap[smallest]] = [
        this.heap[smallest],
        this.heap[current],
      ];
      current = smallest;
    }
  }
}

function isAllowedForMode(edge: CompactEdge, mode: MobilityMode) {
  if (mode === "walking") {
    return edge.wa;
  }

  if (mode === "wheelchair") {
    return edge.wh;
  }

  if (mode === "walker") {
    return edge.wk;
  }

  return edge.sr;
}

function addNodeCoordinate(
  nodeCoordinates: Map<number, LatLngPoint>,
  nodeId: number,
  coordinate: [number, number],
) {
  if (!nodeCoordinates.has(nodeId)) {
    nodeCoordinates.set(nodeId, { lng: coordinate[0], lat: coordinate[1] });
  }
}

function addToSpatialIndex(spatialIndex: Map<string, number[]>, nodeId: number, point: LatLngPoint) {
  const key = gridKey(point);
  const bucket = spatialIndex.get(key) ?? [];
  bucket.push(nodeId);
  spatialIndex.set(key, bucket);
}

function addGraphEdge(adjacency: Map<number, GraphEdge[]>, from: number, edge: GraphEdge) {
  const edges = adjacency.get(from) ?? [];
  edges.push(edge);
  adjacency.set(from, edges);
}

function shouldAddReverseEdge(edge: CompactEdge) {
  return !edge.wo || edge.o === "B";
}

function createGraph(network: CompactNetwork, mode: MobilityMode): NetworkGraph {
  const adjacency = new Map<number, GraphEdge[]>();
  const nodeCoordinates = new Map<number, LatLngPoint>();
  const spatialIndex = new Map<string, number[]>();

  for (const edgeData of network.edges) {
    if (!isAllowedForMode(edgeData, mode) || edgeData.c.length < 2 || edgeData.l <= 0) {
      continue;
    }

    const coordinates = edgeData.c;
    const sourceCoord = coordinates[0];
    const targetCoord = coordinates[coordinates.length - 1];

    addNodeCoordinate(nodeCoordinates, edgeData.s, sourceCoord);
    addNodeCoordinate(nodeCoordinates, edgeData.t, targetCoord);

    const edge: GraphEdge = {
      to: edgeData.t,
      edgeId: edgeData.i,
      lengthM: edgeData.l,
      slopeMean: edgeData.sm,
      slopeMax: edgeData.sx,
      crosswalkEstimate: edgeData.cw,
      facilityEstimate: edgeData.fc,
      isSteps: edgeData.st,
      coordinates,
    };

    addGraphEdge(adjacency, edgeData.s, edge);

    if (shouldAddReverseEdge(edgeData)) {
      addGraphEdge(adjacency, edgeData.t, {
        ...edge,
        to: edgeData.s,
        coordinates: [...coordinates].reverse(),
      });
    }
  }

  for (const [nodeId, point] of nodeCoordinates) {
    if (adjacency.has(nodeId)) {
      addToSpatialIndex(spatialIndex, nodeId, point);
    }
  }

  return { adjacency, nodeCoordinates, spatialIndex };
}

function gridKey(point: LatLngPoint) {
  return `${Math.floor(point.lng / GRID_SIZE_DEGREES)}:${Math.floor(
    point.lat / GRID_SIZE_DEGREES,
  )}`;
}

function haversineMeters(a: LatLngPoint, b: LatLngPoint) {
  const radius = 6371008.8;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function nearestNode(graph: NetworkGraph, point: LatLngPoint) {
  const [baseLng, baseLat] = gridKey(point).split(":").map(Number);
  let bestNode: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let radius = 0; radius <= 12; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
          continue;
        }

        const bucket = graph.spatialIndex.get(`${baseLng + dx}:${baseLat + dy}`) ?? [];
        for (const nodeId of bucket) {
          const nodePoint = graph.nodeCoordinates.get(nodeId);
          if (!nodePoint) {
            continue;
          }

          const distance = haversineMeters(point, nodePoint);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestNode = nodeId;
          }
        }
      }
    }

    if (bestNode !== null && bestDistance < (radius + 1) * GRID_SIZE_DEGREES * 111000) {
      break;
    }
  }

  return bestNode;
}

function edgeCost(edge: GraphEdge, routeType: RouteType, weights: CriteriaWeights) {
  if (routeType === "shortest") {
    return edge.lengthM;
  }

  const slopePenalty = Math.min(edge.slopeMean / 15, 2) * (weights.slope / 30);
  const stepPenalty = edge.isSteps ? 6 * (weights.stairs / 25) : 0;
  const crossingPenalty = edge.crosswalkEstimate * 0.8 * (weights.crossing / 10);
  const sidewalkPenalty = edge.facilityEstimate <= 0 ? 0.08 * (weights.sidewalk / 15) : 0;

  return edge.lengthM * (1 + slopePenalty + stepPenalty + crossingPenalty + sidewalkPenalty);
}

function coordinatesAlmostEqual(a: [number, number], b: [number, number]) {
  return Math.abs(a[0] - b[0]) < 0.0000002 && Math.abs(a[1] - b[1]) < 0.0000002;
}

function pushCoordinate(coordinates: [number, number][], coordinate: [number, number]) {
  const previous = coordinates.at(-1);
  if (!previous || !coordinatesAlmostEqual(previous, coordinate)) {
    coordinates.push(coordinate);
  }
}

function runDijkstra(
  graph: NetworkGraph,
  startNode: number,
  endNode: number,
  routeType: RouteType,
  weights: CriteriaWeights,
): RouteSearchResult | null {
  const queue = new PriorityQueue<number>();
  const distances = new Map<number, number>();
  const previous = new Map<number, { node: number; edge: GraphEdge }>();

  distances.set(startNode, 0);
  queue.push(startNode, 0);

  while (queue.size > 0) {
    const queued = queue.pop();
    if (queued === null) {
      break;
    }

    const current = queued.item;
    const currentDistance = distances.get(current) ?? Number.POSITIVE_INFINITY;
    if (queued.priority > currentDistance) {
      continue;
    }

    if (current === endNode) {
      break;
    }

    for (const edge of graph.adjacency.get(current) ?? []) {
      const nextDistance = currentDistance + edgeCost(edge, routeType, weights);
      const knownDistance = distances.get(edge.to) ?? Number.POSITIVE_INFINITY;

      if (nextDistance < knownDistance) {
        distances.set(edge.to, nextDistance);
        previous.set(edge.to, { node: current, edge });
        queue.push(edge.to, nextDistance);
      }
    }
  }

  const totalCost = distances.get(endNode);
  if (totalCost === undefined) {
    return null;
  }

  const nodePath = [endNode];
  const edges: GraphEdge[] = [];
  let current = endNode;

  while (current !== startNode) {
    const item = previous.get(current);
    if (!item) {
      return null;
    }

    edges.push(item.edge);
    nodePath.push(item.node);
    current = item.node;
  }

  return {
    nodePath: nodePath.reverse(),
    edges: edges.reverse(),
    cost: totalCost,
  };
}

function pathToLineString(
  result: RouteSearchResult,
  graph: NetworkGraph,
  requestedStart: LatLngPoint,
  requestedEnd: LatLngPoint,
): GeoJSON.LineString {
  const coordinates: [number, number][] = [];
  pushCoordinate(coordinates, [requestedStart.lng, requestedStart.lat]);

  for (let index = 0; index < result.edges.length; index += 1) {
    const edge = result.edges[index];
    const edgeCoords = edge.coordinates;

    const fromNode = result.nodePath[index];
    const toNode = result.nodePath[index + 1];
    const fromPoint = graph.nodeCoordinates.get(fromNode);
    const toPoint = graph.nodeCoordinates.get(toNode);
    const correctedEdgeCoords = [...edgeCoords] as [number, number][];

    if (fromPoint) {
      correctedEdgeCoords[0] = [fromPoint.lng, fromPoint.lat];
    }

    if (toPoint) {
      correctedEdgeCoords[correctedEdgeCoords.length - 1] = [toPoint.lng, toPoint.lat];
    }

    if (coordinates.length === 0) {
      correctedEdgeCoords.forEach((coordinate) => pushCoordinate(coordinates, coordinate));
    } else {
      const first = correctedEdgeCoords[0];
      const last = coordinates.at(-1);

      if (last && !coordinatesAlmostEqual(last, first)) {
        pushCoordinate(coordinates, first);
      }

      correctedEdgeCoords.slice(1).forEach((coordinate) => {
        pushCoordinate(coordinates, coordinate);
      });
    }
  }

  pushCoordinate(coordinates, [requestedEnd.lng, requestedEnd.lat]);

  return {
    type: "LineString",
    coordinates,
  };
}

function pathToResponseRoute(
  result: RouteSearchResult,
  routeType: RouteType,
  graph: NetworkGraph,
  requestedStart: LatLngPoint,
  requestedEnd: LatLngPoint,
): RouteResponseRoute {
  const distanceM = result.edges.reduce((sum, edge) => sum + edge.lengthM, 0);
  const stairsCount = result.edges.filter((edge) => edge.isSteps).length;
  const steepSectionCount = result.edges.filter((edge) => edge.slopeMean >= 8).length;
  const unsafeCrossingCount = Math.round(
    result.edges.reduce((sum, edge) => sum + edge.crosswalkEstimate, 0),
  );
  const slopeBurden =
    result.edges.reduce((sum, edge) => sum + edge.lengthM * Math.min(edge.slopeMean, 20), 0) /
    Math.max(distanceM, 1);
  const burdenScore = Math.min(
    100,
    Math.round(slopeBurden * 3 + stairsCount * 12 + unsafeCrossingCount * 2),
  );

  return {
    routeType,
    distanceM: Math.round(distanceM),
    durationMin: Math.max(1, Math.round(distanceM / 70)),
    burdenScore,
    geometry: pathToLineString(result, graph, requestedStart, requestedEnd),
    summary: {
      stairsCount,
      steepSectionCount,
      unsafeCrossingCount,
    },
  };
}

async function loadNetwork(signal?: AbortSignal): Promise<CompactNetwork> {
  networkPromise ??= fetch(NETWORK_URL, { signal }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`보행 네트워크 파일을 불러오지 못했습니다. 상태 코드: ${response.status}`);
    }

    return (await response.json()) as CompactNetwork;
  });

  try {
    return await networkPromise;
  } catch (error) {
    networkPromise = null;
    throw error;
  }
}

async function getGraph(mode: MobilityMode, signal?: AbortSignal) {
  const cached = graphCache.get(mode);
  if (cached) {
    return cached;
  }

  const network = await loadNetwork(signal);
  const graph = createGraph(network, mode);
  graphCache.set(mode, graph);

  return graph;
}

export async function calculateRoutesFromNetwork(
  request: RouteRequest,
  signal?: AbortSignal,
): Promise<RouteResponse> {
  const graph = await getGraph(request.mobilityMode, signal);
  const startNode = nearestNode(graph, request.start);
  const endNode = nearestNode(graph, request.end);

  if (startNode === null || endNode === null) {
    return { routes: [] };
  }

  const shortest = runDijkstra(graph, startNode, endNode, "shortest", request.weights);
  const accessible = runDijkstra(graph, startNode, endNode, "accessible", request.weights);

  if (!shortest || !accessible) {
    return { routes: [] };
  }

  return {
    routes: [
      pathToResponseRoute(shortest, "shortest", graph, request.start, request.end),
      pathToResponseRoute(accessible, "accessible", graph, request.start, request.end),
    ],
  };
}

