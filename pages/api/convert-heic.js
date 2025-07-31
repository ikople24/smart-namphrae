export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // ตรวจสอบว่าเป็นไฟล์ .heic หรือไม่
    if (url.toLowerCase().includes('.heic')) {
      // สำหรับไฟล์ .heic ให้ส่งกลับรูปภาพ default
      return res.redirect('/default-icon.png');
    }

    // สำหรับไฟล์อื่นๆ ให้ proxy ไปยัง URL ต้นฉบับ
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Error handling image:', error);
    // ส่งกลับรูปภาพ default เมื่อเกิดข้อผิดพลาด
    return res.redirect('/default-icon.png');
  }
} 