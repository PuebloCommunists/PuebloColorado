const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');

const PORT = 3000;
const USERS_FILE = './users.json';

// Initialize empty users file if it doesn't exist
async function initUsersFile() {
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify({
      activeUsers: [],
      pendingUsers: []
    }, null, 2));
  }
}

// Read users from file
async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { activeUsers: [], pendingUsers: [] };
  }
}

// Write users to file
async function writeUsers(usersData) {
  await fs.writeFile(USERS_FILE, JSON.stringify(usersData, null, 2));
}

// Simple CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // GET /users - Get all active users
    if (req.method === 'GET' && parsedUrl.pathname === '/users') {
      const users = await readUsers();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(users.activeUsers));
      return;
    }

    // GET /users/pending - Get pending users
    if (req.method === 'GET' && parsedUrl.pathname === '/users/pending') {
      const users = await readUsers();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(users.pendingUsers));
      return;
    }

    // POST /register - Register new user
    if (req.method === 'POST' && parsedUrl.pathname === '/register') {
      let body = '';
      req.on('data', chunk => body += chunk);
      
      req.on('end', async () => {
        try {
          const userData = JSON.parse(body);
          const users = await readUsers();
          
          // Check for duplicates
          const allUsers = [...users.activeUsers, ...users.pendingUsers];
          const isDuplicate = allUsers.some(u => 
            u.username === userData.username || u.email === userData.email
          );
          
          if (isDuplicate) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Username or email already exists' }));
            return;
          }
          
          // Add to pending
          users.pendingUsers.push({
            ...userData,
            id: Date.now(),
            submittedAt: new Date().toISOString()
          });
          
          await writeUsers(users);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    // POST /approve - Approve user
    if (req.method === 'POST' && parsedUrl.pathname === '/approve') {
      let body = '';
      req.on('data', chunk => body += chunk);
      
      req.on('end', async () => {
        try {
          const { userId } = JSON.parse(body);
          const users = await readUsers();
          
          const userIndex = users.pendingUsers.findIndex(u => u.id === userId);
          if (userIndex === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'User not found' }));
            return;
          }
          
          const user = users.pendingUsers[userIndex];
          // Remove sensitive data
          const { rawPassword, id, submittedAt, ...cleanUser } = user;
          cleanUser.timestamp = new Date().toISOString();
          
          users.activeUsers.push(cleanUser);
          users.pendingUsers.splice(userIndex, 1);
          
          await writeUsers(users);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    // 404 for unknown routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

// Start server
initUsersFile().then(() => {
  server.listen(PORT, () => {
    console.log(`✅ ACP Backend running on port ${PORT}`);
    console.log(`📁 Users stored in: ${path.resolve(USERS_FILE)}`);
  });
});