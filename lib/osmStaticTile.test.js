import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStaticMapTile } from './osmStaticTile.js';

test('lat=0, lng=0, zoom=10 -> tile กึ่งกลางพอดี (512,512) พินอยู่มุมบนซ้ายของ tile เป๊ะ', () => {
  const result = getStaticMapTile(0, 0, 10);
  assert.equal(result.tileUrl, 'https://tile.openstreetmap.org/10/512/512.png');
  assert.equal(result.pinXRatio, 0);
  assert.equal(result.pinYRatio, 0);
});

test('คำนวณ tile และตำแหน่งพินถูกต้องสำหรับพิกัดจริง (zoom=16)', () => {
  const result = getStaticMapTile(18.1458, 100.1408, 16);
  assert.equal(result.tileUrl, 'https://tile.openstreetmap.org/16/50998/29408.png');
  assert.ok(Math.abs(result.pinXRatio - 0.07630222222360317) < 1e-9);
  assert.ok(Math.abs(result.pinYRatio - 0.009918001891492167) < 1e-9);
});

test('ไม่ส่ง zoom มา -> ใช้ค่า default 16', () => {
  const result = getStaticMapTile(18.1458, 100.1408);
  assert.equal(result.tileUrl, 'https://tile.openstreetmap.org/16/50998/29408.png');
});
