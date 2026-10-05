const DEFAULT_ZOOM = 16;

// Returns the 2x2 block of OSM tiles that covers a one-tile-sized window
// centered on (lat, lng). Each tile's offsetX/offsetY is its top-left corner
// relative to the window's top-left, in tile units (multiply by the rendered
// tile size to get its position). The point itself is always at the window's
// center, i.e. (0.5, 0.5).
export function getCenteredMapTiles(lat, lng, zoom = DEFAULT_ZOOM) {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** zoom;

  const xTileFloat = ((lng + 180) / 360) * n;
  const yTileFloat =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const windowLeft = xTileFloat - 0.5;
  const windowTop = yTileFloat - 0.5;
  const firstX = Math.floor(windowLeft);
  const firstY = Math.floor(windowTop);

  const tiles = [];
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      const x = firstX + dx;
      const y = firstY + dy;
      tiles.push({
        tileUrl: `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`,
        offsetX: x - windowLeft,
        offsetY: y - windowTop,
      });
    }
  }
  return { tiles };
}

const TILE_FETCH_TIMEOUT_MS = 5000;

async function isTileReachable(tileUrl) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TILE_FETCH_TIMEOUT_MS);
    const response = await fetch(tileUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

export async function getVerifiedMapTiles(lat, lng, zoom = DEFAULT_ZOOM) {
  const map = getCenteredMapTiles(lat, lng, zoom);
  const results = await Promise.all(map.tiles.map((t) => isTileReachable(t.tileUrl)));
  return results.every(Boolean) ? map : null;
}
