const DEFAULT_ZOOM = 16;

export function getStaticMapTile(lat, lng, zoom = DEFAULT_ZOOM) {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** zoom;

  const xTileFloat = ((lng + 180) / 360) * n;
  const yTileFloat =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const xTile = Math.floor(xTileFloat);
  const yTile = Math.floor(yTileFloat);

  return {
    tileUrl: `https://tile.openstreetmap.org/${zoom}/${xTile}/${yTile}.png`,
    pinXRatio: xTileFloat - xTile,
    pinYRatio: yTileFloat - yTile,
  };
}

const TILE_FETCH_TIMEOUT_MS = 5000;

export async function getVerifiedMapTile(lat, lng, zoom = DEFAULT_ZOOM) {
  const tile = getStaticMapTile(lat, lng, zoom);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TILE_FETCH_TIMEOUT_MS);
    const response = await fetch(tile.tileUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    return tile;
  } catch {
    return null;
  }
}
