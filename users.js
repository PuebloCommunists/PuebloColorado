// netlify/functions/users.js
const fetch = require('node-fetch');

// Your GitHub token - SAFE because it's server-side
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIST_ID = 'e6ee8832e9d0c72b6e8df85ad2b5e9ba';

exports.handler = async function(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      // Load users from Gist
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
      });
      
      if (!response.ok) throw new Error('GitHub API failed');
      
      const gist = await response.json();
      const content = JSON.parse(gist.files['acp-users.json'].content);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(content)
      };
    }
    
    if (event.httpMethod === 'POST') {
      // Save users to Gist
      const usersData = JSON.parse(event.body);
      
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            'acp-users.json': {
              content: JSON.stringify(usersData, null, 2)
            }
          }
        })
      });
      
      if (!response.ok) throw new Error('GitHub API failed');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }
    
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};