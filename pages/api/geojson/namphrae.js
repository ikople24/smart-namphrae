import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    // อ่านไฟล์ GeoJSON จาก public folder
    const filePath = path.join(process.cwd(), 'public', 'cmu_namphare.geojson');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const geoJsonData = JSON.parse(fileContents);
    
    // ตั้งค่า headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // cache 1 ชั่วโมง
    
    res.status(200).json(geoJsonData);
  } catch (error) {
    console.error('Error reading GeoJSON file:', error);
    res.status(500).json({ error: 'Failed to load GeoJSON data', details: error.message });
  }
}



