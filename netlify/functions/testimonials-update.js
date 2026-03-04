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

async function handler(event, context) {
  var user = requireIdentity(context);

  if (!user || !userHasAdminRole(user)) {
    return jsonResponse(403, { error: 'Unauthorized' });
  }

  try {
    var body = JSON.parse(event.body || '{}');
    var action = body.action;
    var token = process.env.NETLIFY_API_TOKEN;
    var siteId = process.env.NETLIFY_SITE_ID;

    if (!token || !siteId) {
      throw new Error('Missing environment variables');
    }

    if (action === 'add') {
      // Post to forms as form-urlencoded
      var formData = new URLSearchParams();
      formData.append('quote', body.quote || '');
      formData.append('author', body.author || '');
      formData.append('title', body.title || '');
      formData.append('location', body.location || '');
      formData.append('avatar', body.avatar || '');
      formData.append('published', body.published ? 'true' : 'false');

      var formResponse = await fetch(
        'https://kekauoha-music.netlify.app/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData.toString() + '&form-name=testimonials'
        }
      );

      if (!formResponse.ok) {
        throw new Error('Form submission failed');
      }

      return jsonResponse(200, { success: true, message: 'Testimonial added' });
    } else if (action === 'delete') {
      var submissionId = body.submissionId;
      var deleteUrl =
        'https://api.netlify.com/api/v1/sites/' +
        siteId +
        '/forms/testimonials/submissions/' +
        submissionId;

      var deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer ' + token
        }
      });

      if (!deleteResponse.ok) {
        throw new Error('Delete failed');
      }

      return jsonResponse(200, { success: true, message: 'Testimonial deleted' });
    } else {
      return jsonResponse(400, { error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error updating testimonial:', error);
    return jsonResponse(500, { error: error.message });
  }
}

module.exports = { handler };
