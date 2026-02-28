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

function normalizeBookingSubmission(item) {
  var data = item.data || {};
  return {
    id: item.id,
    submittedAt: item.created_at || null,
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    email: data.email || '',
    phone: data.phone || '',
    instrument: data.instrument || '',
    level: data.level || '',
    sessionType: data.sessionType || '',
    message: data.message || '',
    status: 'new',
    notes: ''
  };
}

function selectLatestUpdates(updateSubmissions) {
  var bySubmission = new Map();

  updateSubmissions.forEach(function (item) {
    var data = item.data || {};
    var submissionId = data.submissionId;
    if (!submissionId) return;

    var current = bySubmission.get(submissionId);
    if (!current || new Date(item.created_at) > new Date(current.created_at)) {
      bySubmission.set(submissionId, {
        status: data.status || 'new',
        notes: data.notes || '',
        created_at: item.created_at || ''
      });
    }
  });

  return bySubmission;
}

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  var user = requireIdentity(context);
  if (!user) {
    return jsonResponse(401, { error: 'Authentication required' });
  }

  var apiToken = process.env.NETLIFY_API_TOKEN;
  var siteId = process.env.NETLIFY_SITE_ID;

  if (!apiToken || !siteId) {
    return jsonResponse(500, {
      error: 'Missing NETLIFY_API_TOKEN or NETLIFY_SITE_ID environment variables'
    });
  }

  try {
    var formsUrl = 'https://api.netlify.com/api/v1/sites/' + encodeURIComponent(siteId) + '/forms';
    var forms = await fetchNetlifyJson(formsUrl, apiToken);

    var bookingForm = forms.find(function (f) { return f.name === 'booking-request'; });
    var updatesForm = forms.find(function (f) { return f.name === 'booking-updates'; });

    if (!bookingForm) {
      return jsonResponse(200, {
        submissions: [],
        warning: 'Form booking-request was not found yet. Submit a test booking first.'
      });
    }

    var bookingSubmissionsUrl = 'https://api.netlify.com/api/v1/forms/' + encodeURIComponent(bookingForm.id) + '/submissions?per_page=100';
    var bookingSubmissions = await fetchNetlifyJson(bookingSubmissionsUrl, apiToken);

    var updates = [];
    if (updatesForm) {
      var updatesUrl = 'https://api.netlify.com/api/v1/forms/' + encodeURIComponent(updatesForm.id) + '/submissions?per_page=100';
      updates = await fetchNetlifyJson(updatesUrl, apiToken);
    }

    var latestUpdates = selectLatestUpdates(updates);

    var normalized = bookingSubmissions
      .map(normalizeBookingSubmission)
      .map(function (booking) {
        var update = latestUpdates.get(booking.id);
        if (!update) return booking;

        return {
          id: booking.id,
          submittedAt: booking.submittedAt,
          firstName: booking.firstName,
          lastName: booking.lastName,
          email: booking.email,
          phone: booking.phone,
          instrument: booking.instrument,
          level: booking.level,
          sessionType: booking.sessionType,
          message: booking.message,
          status: update.status || booking.status,
          notes: update.notes || ''
        };
      })
      .sort(function (a, b) {
        return new Date(b.submittedAt) - new Date(a.submittedAt);
      });

    return jsonResponse(200, {
      submissions: normalized,
      user: {
        email: user.email || ''
      }
    });
  } catch (error) {
    return jsonResponse(500, {
      error: 'Failed to load submissions',
      detail: error.message
    });
  }
};
