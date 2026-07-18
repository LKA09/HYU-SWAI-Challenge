import { readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(root, "public", "gis", "processed_network", "edges.geojson");
const outputPath = join(root, "public", "gis", "processed_network", "network.compact.json");

const keepNumber = (value, digits = 3) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(digits));
};

const keepCoordinate = (coordinate) => [
  keepNumber(coordinate[0], 7),
  keepNumber(coordinate[1], 7),
];

const source = JSON.parse(readFileSync(sourcePath, "utf8"));

if (!Array.isArray(source.features)) {
  throw new Error("edges.geojson must be a GeoJSON FeatureCollection.");
}

const edges = [];

for (const feature of source.features) {
  const props = feature.properties ?? {};
  const coordinates = feature.geometry?.coordinates;

  if (
    !props.main_component ||
    !props.walking_allowed ||
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    !(props.length_m > 0)
  ) {
    continue;
  }

  edges.push({
    i: props.edge_id,
    s: props.source,
    t: props.target,
    l: keepNumber(props.length_m, 2),
    sm: keepNumber(props.slope_mean, 3),
    sx: keepNumber(props.slope_max, 3),
    cw: keepNumber(props.crosswalk_est, 3),
    fc: keepNumber(props.facility_est, 3),
    st: Boolean(props.is_steps),
    wa: Boolean(props.walking_allowed),
    wh: Boolean(props.wheelchair_allowed),
    wk: Boolean(props.walker_allowed),
    sr: Boolean(props.stroller_allowed),
    wo: Boolean(props.walk_oneway),
    o: props.oneway ?? "B",
    c: coordinates.map(keepCoordinate),
  });
}

writeFileSync(outputPath, JSON.stringify({ version: 1, edges }), "utf8");

const sourceSizeMb = statSync(sourcePath).size / 1024 / 1024;
const outputSizeMb = statSync(outputPath).size / 1024 / 1024;

console.log(
  `Created ${outputPath} with ${edges.length.toLocaleString()} edges: ` +
    `${sourceSizeMb.toFixed(1)} MB -> ${outputSizeMb.toFixed(1)} MB`,
);
