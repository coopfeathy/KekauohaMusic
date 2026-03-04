function jsonResponse(statusCode, payload) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  };
}

function requireIdentity(context) {
  var user = context && context.clientContext && context.clientContext.user;
  if (!user) {
    return null;
  }
  return user;
}

function normalizeRoles(rawRoles) {
  if (!rawRoles) return [];
  if (Array.isArray(rawRoles)) {
    return rawRoles
      .map(function (role) { return String(role || '').trim().toLowerCase(); })
      .filter(Boolean);
  }

  return [String(rawRoles).trim().toLowerCase()].filter(Boolean);
}

function userHasAdminRole(user) {
  if (!user) return false;
  var appMetadata = user.app_metadata;

  if (typeof appMetadata === 'string') {
    try {
      appMetadata = JSON.parse(appMetadata);
    } catch (_error) {
      appMetadata = null;
    }
  }

  if (!appMetadata || typeof appMetadata !== 'object') {
    return false;
  }

  return normalizeRoles(appMetadata.roles).includes('admin');
}

async function fetchNetlifyJson(url, token) {
  var response = await fetch(url, {
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Netlify API request failed: ' + response.status);
  }

  return response.json();
}

async function handler(event, context) {
  var user = requireIdentity(context);

  if (!user || !userHasAdminRole(user)) {
    return jsonResponse(403, { error: 'Unauthorized' });
  }

  try {
    var token = process.env.NETLIFY_API_TOKEN;
    var siteId = process.env.NETLIFY_SITE_ID;

    if (!token || !siteId) {
      throw new Error('Missing environment variables');
    }

    var url = 'https://api.netlify.com/api/v1/sites/' + siteId + '/forms/testimonials/submissions';
    var submissions = await fetchNetlifyJson(url, token);

    var testimonials = (submissions || [])
      .map(function (sub) {
        var data = sub.data || {};
        return {
          id: sub.id,
          quote: data.quote,
          author: data.author,
          title: data.title,
          location: data.location,
          avatar: data.avatar,
          created_at: sub.created_at,
          published: data.published === 'true' || data.published === true
        };
      })
      .sort(function (a, b) {
        return new Date(b.created_at) - new Date(a.created_at);
      });

    return jsonResponse(200, testimonials);
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return jsonResponse(500, { error: error.message });
  }
}

module.exports = { handler };
