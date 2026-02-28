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

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  var user = requireIdentity(context);
  if (!user) {
    return jsonResponse(401, { error: 'Authentication required' });
  }

  try {
    var body = JSON.parse(event.body || '{}');
    var submissionId = String(body.submissionId || '').trim();
    var status = String(body.status || 'new').trim().toLowerCase();
    var notes = String(body.notes || '').trim();

    var allowedStatuses = ['new', 'contacted', 'booked', 'closed'];
    if (!submissionId) {
      return jsonResponse(400, { error: 'submissionId is required' });
    }

    if (allowedStatuses.indexOf(status) === -1) {
      return jsonResponse(400, { error: 'Invalid status value' });
    }

    var proto = event.headers['x-forwarded-proto'] || 'https';
    var host = event.headers['x-forwarded-host'] || event.headers.host;
    if (!host) {
      return jsonResponse(500, { error: 'Unable to determine site host' });
    }

    var postUrl = proto + '://' + host + '/';

    var formPayload = new URLSearchParams();
    formPayload.append('form-name', 'booking-updates');
    formPayload.append('submissionId', submissionId);
    formPayload.append('status', status);
    formPayload.append('notes', notes);
    formPayload.append('updatedBy', user.email || 'owner');
    formPayload.append('updatedAt', new Date().toISOString());

    var saveResponse = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formPayload.toString()
    });

    if (!saveResponse.ok) {
      return jsonResponse(500, { error: 'Unable to persist update to Netlify Forms' });
    }

    return jsonResponse(200, {
      ok: true,
      submissionId: submissionId,
      status: status
    });
  } catch (error) {
    return jsonResponse(500, {
      error: 'Failed to save submission update',
      detail: error.message
    });
  }
};
