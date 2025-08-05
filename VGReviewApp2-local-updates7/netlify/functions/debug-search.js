// netlify/functions/debug-search.js
export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Log everything we receive
  const debugInfo = {
    httpMethod: event.httpMethod,
    path: event.path,
    queryStringParameters: event.queryStringParameters,
    headers: event.headers,
    body: event.body,
    timestamp: new Date().toISOString()
  };

  console.log('Debug - Request received:', JSON.stringify(debugInfo, null, 2));

  // Try to extract query from all possible sources
  let possibleQueries = {};

  if (event.queryStringParameters) {
    Object.keys(event.queryStringParameters).forEach(key => {
      possibleQueries[key] = event.queryStringParameters[key];
    });
  }

  if (event.body) {
    try {
      const bodyData = JSON.parse(event.body);
      Object.keys(bodyData).forEach(key => {
        possibleQueries[`body.${key}`] = bodyData[key];
      });
    } catch (e) {
      possibleQueries['body_raw'] = event.body;
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Debug information collected',
      debugInfo,
      possibleQueries,
      recommendation: Object.keys(possibleQueries).length === 0
        ? 'No query parameters found - check your frontend implementation'
        : `Found parameters: ${Object.keys(possibleQueries).join(', ')}`
    }, null, 2)
  };
};
