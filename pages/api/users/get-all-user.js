
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const response = await fetch(`${process.env.BACKEND_API_URL}/api/users/all-basic`, {
      headers: {
        'x-app-id': process.env.NEXT_PUBLIC_APP_ID,
      },
    });
    const data = await response.json();
    const users = (data.users || data);
    const safeUsers = Array.isArray(users)
      ? users.map(({ idCard, phone, clerkId, ...safe }) => safe)
      : users;
    return res.status(response.status).json(safeUsers);
  } catch (error) {
    console.error('Failed to fetch users from backend:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}