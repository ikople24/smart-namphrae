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
