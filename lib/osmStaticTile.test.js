import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCenteredMapTiles } from './osmStaticTile.js';

test('lat=0, lng=0, zoom=10 -> จุดอยู่ตรงมุมของ 4 tile พอดี แต่ละ tile ขยับครึ่ง tile', () => {
  const { tiles } = getCenteredMapTiles(0, 0, 10);
  assert.deepEqual(
    tiles.map((t) => t.tileUrl),
    [
      'https://tile.openstreetmap.org/10/511/511.png',
      'https://tile.openstreetmap.org/10/512/511.png',
      'https://tile.openstreetmap.org/10/511/512.png',
      'https://tile.openstreetmap.org/10/512/512.png',
    ]
  );
  assert.deepEqual(
    tiles.map((t) => [t.offsetX, t.offsetY]),
    [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]
  );
});

test('พิกัดจริง (zoom=16) -> จุดอยู่กลางกรอบพอดี', () => {
  const lat = 18.1458;
  const lng = 100.1408;
  const { tiles } = getCenteredMapTiles(lat, lng, 16);
  assert.equal(tiles.length, 4);
  // จุดอยู่ที่ tile 50998 + 0.0763 (x), 29408 + 0.0099 (y)
  // กรอบเริ่มที่ x-0.5, y-0.5 จึงใช้ tile 50997..50998 และ 29407..29408
  assert.equal(tiles[0].tileUrl, 'https://tile.openstreetmap.org/16/50997/29407.png');
  assert.equal(tiles[3].tileUrl, 'https://tile.openstreetmap.org/16/50998/29408.png');
  // tile ที่มีจุดอยู่ (50998, 29408) ต้องวางให้จุดตกที่ (0.5, 0.5) ของกรอบ
  assert.ok(Math.abs(tiles[3].offsetX + 0.07630222222360317 - 0.5) < 1e-9);
  assert.ok(Math.abs(tiles[3].offsetY + 0.009918001891492167 - 0.5) < 1e-9);
});

test('ไม่ส่ง zoom มา -> ใช้ค่า default 16', () => {
  const { tiles } = getCenteredMapTiles(18.1458, 100.1408);
  assert.ok(tiles[0].tileUrl.startsWith('https://tile.openstreetmap.org/16/'));
});
