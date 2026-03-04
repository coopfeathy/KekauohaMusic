(function () {
  'use strict';

  var loginBtn = document.getElementById('loginBtn');
  var logoutBtn = document.getElementById('logoutBtn');
  var refreshBtn = document.getElementById('refreshBtn');
  var tableWrap = document.getElementById('tableWrap');
  var authStatus = document.getElementById('authStatus');
  var errorBox = document.getElementById('errorBox');
  var accessDenied = document.getElementById('accessDenied');
  var logoutFromDenied = document.getElementById('logoutFromDenied');
  var submissionsBody = document.getElementById('submissionsBody');
  var filtersWrap = document.getElementById('filtersWrap');
  var searchInput = document.getElementById('searchInput');
  var statusFilter = document.getElementById('statusFilter');
  var clearFiltersBtn = document.getElementById('clearFiltersBtn');
  var resultsMeta = document.getElementById('resultsMeta');
  var paginationWrap = document.getElementById('paginationWrap');
  var prevPageBtn = document.getElementById('prevPageBtn');
  var nextPageBtn = document.getElementById('nextPageBtn');
  var pageMeta = document.getElementById('pageMeta');
  var adminNav = document.querySelector('.admin-nav');
  var sortButtons = document.querySelectorAll('.sort-btn');
  var sortIndicators = document.querySelectorAll('[data-sort-indicator]');

  var allSubmissions = [];
  var currentPage = 1;
  var pageSize = 10;
  var sortState = {
    key: 'submittedAt',
    dir: 'desc'
  };

  function normalizeRoles(rawRoles) {
    if (!rawRoles) return [];
    if (Array.isArray(rawRoles)) {
      return rawRoles
        .map(function (role) { return String(role || '').trim().toLowerCase(); })
        .filter(Boolean);
    }

    return [String(rawRoles).trim().toLowerCase()].filter(Boolean);
  }

  function getUserRoles(user) {
    if (!user) return [];
    var appMetadata = user.app_metadata;

    if (typeof appMetadata === 'string') {
      try {
        appMetadata = JSON.parse(appMetadata);
      } catch (_error) {
        appMetadata = null;
      }
    }

    if (!appMetadata || typeof appMetadata !== 'object') {
      return [];
    }

    return normalizeRoles(appMetadata.roles);
  }

  function isAdminUser(user) {
    return getUserRoles(user).includes('admin');
  }

  function setNonAdminState() {
    tableWrap.classList.add('hidden');
    if (filtersWrap) filtersWrap.classList.add('hidden');
    if (resultsMeta) resultsMeta.classList.add('hidden');
    if (paginationWrap) paginationWrap.classList.add('hidden');
    loginBtn.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    refreshBtn.classList.add('hidden');
    authStatus.classList.add('hidden');
    if (adminNav) adminNav.classList.add('hidden');
    if (accessDenied) accessDenied.classList.remove('hidden');
  }

  function setAdminState() {
    if (adminNav) adminNav.classList.remove('hidden');
  }

  function setLoggedOutState(message) {
    tableWrap.classList.add('hidden');
    if (filtersWrap) filtersWrap.classList.add('hidden');
    if (resultsMeta) resultsMeta.classList.add('hidden');
    if (paginationWrap) paginationWrap.classList.add('hidden');
    if (adminNav) adminNav.classList.add('hidden');
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    refreshBtn.classList.add('hidden');
    authStatus.classList.remove('hidden');
    authStatus.textContent = message;
    if (accessDenied) accessDenied.classList.add('hidden');
  }

  function setError(message) {
    if (!message) {
      errorBox.textContent = '';
      errorBox.classList.add('hidden');
      return;
    }

    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function statusPillClass(status) {
    var normalized = String(status || 'new').toLowerCase();
    if (normalized === 'contacted') return 'pill pill-contacted';
    if (normalized === 'booked') return 'pill pill-booked';
    if (normalized === 'closed') return 'pill pill-closed';
    return 'pill pill-new';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  }

  function buildRow(item) {
    var row = document.createElement('tr');
    row.setAttribute('data-id', item.id);

    row.innerHTML = '' +
      '<td data-label="Submitted">' + escapeHtml(formatDate(item.submittedAt)) + '</td>' +
      '<td data-label="Student"><strong>' + escapeHtml(item.firstName + ' ' + item.lastName).trim() + '</strong></td>' +
      '<td data-label="Contact">' +
        '<div><a href="mailto:' + escapeHtml(item.email) + '">' + escapeHtml(item.email || '—') + '</a></div>' +
        '<div>' + escapeHtml(item.phone || '—') + '</div>' +
      '</td>' +
      '<td data-label="Program">' +
        '<div>' + escapeHtml(item.instrument || '—') + '</div>' +
        '<div class="admin-note">' + escapeHtml(item.level || '—') + '</div>' +
      '</td>' +
      '<td data-label="Message">' + escapeHtml(item.message || '—') + '</td>' +
      '<td data-label="Status">' +
        '<div class="' + statusPillClass(item.status) + '">' + escapeHtml(item.status || 'new') + '</div>' +
        '<select aria-label="Update status" class="status-select" style="margin-top:0.45rem;">' +
          '<option value="new">new</option>' +
          '<option value="contacted">contacted</option>' +
          '<option value="booked">booked</option>' +
          '<option value="closed">closed</option>' +
        '</select>' +
      '</td>' +
      '<td data-label="Notes"><textarea rows="3" class="notes-input" placeholder="Add private notes for follow-up...">' + escapeHtml(item.notes || '') + '</textarea></td>' +
      '<td><button type="button" class="btn btn-outline save-btn">Save</button></td>';

    var select = row.querySelector('.status-select');
    select.value = item.status || 'new';

    return row;
  }

  function renderSubmissions(items) {
    submissionsBody.innerHTML = '';

    if (!items.length) {
      var empty = document.createElement('tr');
      empty.innerHTML = '<td colspan="8" style="text-align: center; padding: 3rem 1rem; color: var(--color-text-muted); font-size: 1rem;"><div style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.5;">📭</div>No matching submissions found.<br><span style="font-size: 0.9rem; opacity: 0.8;">Try adjusting your filters or search terms.</span></td>';
      submissionsBody.appendChild(empty);
      return;
    }

    items.forEach(function (item) {
      submissionsBody.appendChild(buildRow(item));
    });
  }

  function getSubmissionSearchBlob(item) {
    return [
      item.firstName,
      item.lastName,
      item.email,
      item.phone,
      item.instrument,
      item.level,
      item.message,
      item.status,
      item.notes
    ].join(' ').toLowerCase();
  }

  function compareValues(a, b, key) {
    if (key === 'submittedAt') {
      var aTime = new Date(a.submittedAt || 0).getTime();
      var bTime = new Date(b.submittedAt || 0).getTime();
      return aTime - bTime;
    }

    if (key === 'student') {
      var aStudent = (String(a.firstName || '') + ' ' + String(a.lastName || '')).trim().toLowerCase();
      var bStudent = (String(b.firstName || '') + ' ' + String(b.lastName || '')).trim().toLowerCase();
      return aStudent.localeCompare(bStudent);
    }

    if (key === 'status') {
      var aStatus = String(a.status || 'new').toLowerCase();
      var bStatus = String(b.status || 'new').toLowerCase();
      return aStatus.localeCompare(bStatus);
    }

    return 0;
  }

  function updateSortIndicators() {
    sortIndicators.forEach(function (indicator) {
      var key = indicator.getAttribute('data-sort-indicator');
      if (key !== sortState.key) {
        indicator.textContent = '↕';
        return;
      }

      indicator.textContent = sortState.dir === 'asc' ? '↑' : '↓';
    });
  }

  function updatePagination(totalItems) {
    var totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    if (pageMeta) {
      pageMeta.textContent = 'Page ' + String(currentPage) + ' of ' + String(totalPages);
    }

    if (prevPageBtn) {
      prevPageBtn.disabled = currentPage <= 1;
    }

    if (nextPageBtn) {
      nextPageBtn.disabled = currentPage >= totalPages;
    }

    if (paginationWrap) {
      if (totalItems > pageSize) {
        paginationWrap.classList.remove('hidden');
      } else {
        paginationWrap.classList.add('hidden');
      }
    }

    return totalPages;
  }

  function applyFilters() {
    var query = String((searchInput && searchInput.value) || '').trim().toLowerCase();
    var statusValue = String((statusFilter && statusFilter.value) || 'all').toLowerCase();

    var filtered = allSubmissions.filter(function (item) {
      var statusMatch = statusValue === 'all' || String(item.status || 'new').toLowerCase() === statusValue;
      if (!statusMatch) {
        return false;
      }

      if (!query) {
        return true;
      }

      return getSubmissionSearchBlob(item).includes(query);
    });

    var sorted = filtered.slice().sort(function (a, b) {
      var result = compareValues(a, b, sortState.key);
      return sortState.dir === 'asc' ? result : -result;
    });

    var startIndex = (currentPage - 1) * pageSize;
    var paged = sorted.slice(startIndex, startIndex + pageSize);

    renderSubmissions(paged);
    updateSortIndicators();
    updatePagination(sorted.length);

    if (resultsMeta) {
      var endIndex = Math.min(startIndex + paged.length, sorted.length);
      var startDisplay = sorted.length ? startIndex + 1 : 0;
      resultsMeta.textContent = 'Showing ' + String(startDisplay) + '–' + String(endIndex) + ' of ' + String(sorted.length) + ' filtered (' + String(allSubmissions.length) + ' total).';
      resultsMeta.classList.remove('hidden');
    }
  }

  async function getJwt() {
    if (!window.netlifyIdentity) return null;
    var user = window.netlifyIdentity.currentUser();
    if (!user) return null;
    return user.jwt();
  }

  async function loadSubmissions() {
    setError('');

    var user = window.netlifyIdentity && window.netlifyIdentity.currentUser
      ? window.netlifyIdentity.currentUser()
      : null;

    if (!user) {
      setLoggedOutState('Log in to view booking submissions.');
      return;
    }

    if (!isAdminUser(user)) {
      setNonAdminState();
      return;
    }

    var token = await getJwt();
    if (!token) {
      setLoggedOutState('Log in to view booking submissions.');
      return;
    }

    authStatus.textContent = 'Loading submissions…';

    var response = await fetch('/api/admin/submissions', {
      headers: {
        Authorization: 'Bearer ' + token
      }
    });

    if (!response.ok) {
      if (response.status === 403) {
        setNonAdminState();
        return;
      }
      throw new Error('Could not load submissions. Check Netlify Identity and function environment variables.');
    }

    var payload = await response.json();
    allSubmissions = payload.submissions || [];
    currentPage = 1;
    applyFilters();

    if (accessDenied) accessDenied.classList.add('hidden');
    authStatus.classList.remove('hidden');
    authStatus.textContent = 'Loaded ' + String(allSubmissions.length) + ' booking submissions.';
    tableWrap.classList.remove('hidden');
    if (filtersWrap) filtersWrap.classList.remove('hidden');
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    refreshBtn.classList.remove('hidden');
    setAdminState();
  }

  async function saveSubmissionUpdate(row) {
    var token = await getJwt();
    if (!token) {
      throw new Error('Your session expired. Please log in again.');
    }

    var submissionId = row.getAttribute('data-id');
    var status = row.querySelector('.status-select').value;
    var notes = row.querySelector('.notes-input').value;

    var response = await fetch('/api/admin/submissions/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify({
        submissionId: submissionId,
        status: status,
        notes: notes
      })
    });

    if (!response.ok) {
      throw new Error('Save failed. Please try again.');
    }

    var pill = row.querySelector('.pill');
    pill.className = statusPillClass(status);
    pill.textContent = status;

    var current = allSubmissions.find(function (item) {
      return item.id === submissionId;
    });
    if (current) {
      current.status = status;
      current.notes = notes;
    }

    applyFilters();
  }

  submissionsBody.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    if (!target.classList.contains('save-btn')) return;

    var row = target.closest('tr');
    if (!row) return;

    var originalLabel = target.textContent;
    target.disabled = true;
    target.textContent = 'Saving…';

    saveSubmissionUpdate(row)
      .then(function () {
        target.textContent = 'Saved';
        setTimeout(function () {
          target.textContent = originalLabel;
        }, 900);
      })
      .catch(function (error) {
        setError(error.message || 'Save failed.');
        target.textContent = originalLabel;
      })
      .finally(function () {
        target.disabled = false;
      });
  });

  loginBtn.addEventListener('click', function () {
    if (window.netlifyIdentity) {
      window.netlifyIdentity.open('login');
    }
  });

  logoutBtn.addEventListener('click', function () {
    if (!window.netlifyIdentity) return;
    var user = window.netlifyIdentity.currentUser();
    if (!user) return;
    user.logout();
    setTimeout(function() {
      window.location.reload();
    }, 100);
  });

  if (logoutFromDenied) {
    logoutFromDenied.addEventListener('click', function () {
      if (!window.netlifyIdentity) return;
      var user = window.netlifyIdentity.currentUser();
      if (!user) return;
      user.logout();
      setTimeout(function() {
        window.location.reload();
      }, 100);
    });
  }

  refreshBtn.addEventListener('click', function () {
    loadSubmissions().catch(function (error) {
      setError(error.message || 'Unable to refresh submissions.');
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      currentPage = 1;
      applyFilters();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', function () {
      currentPage = 1;
      applyFilters();
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', function () {
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = 'all';
      currentPage = 1;
      applyFilters();
    });
  }

  sortButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var key = button.getAttribute('data-sort-key');
      if (!key) return;

      if (sortState.key === key) {
        sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
      } else {
        sortState.key = key;
        sortState.dir = key === 'submittedAt' ? 'desc' : 'asc';
      }

      currentPage = 1;
      applyFilters();
    });
  });

  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', function () {
      if (currentPage <= 1) return;
      currentPage -= 1;
      applyFilters();
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', function () {
      currentPage += 1;
      applyFilters();
    });
  }

  function initIdentityHandlers() {
    if (!window.netlifyIdentity) {
      authStatus.textContent = 'Netlify Identity is unavailable. Deploy on Netlify and enable Identity.';
      return;
    }

    window.netlifyIdentity.on('init', function () {
      loadSubmissions().catch(function (error) {
        setError(error.message || 'Unable to load submissions.');
      });
    });

    window.netlifyIdentity.on('login', function () {
      window.netlifyIdentity.close();
      loadSubmissions().catch(function (error) {
        setError(error.message || 'Unable to load submissions after login.');
      });
    });

    window.netlifyIdentity.on('logout', function () {
      tableWrap.classList.add('hidden');
      if (filtersWrap) filtersWrap.classList.add('hidden');
      if (resultsMeta) resultsMeta.classList.add('hidden');
      if (paginationWrap) paginationWrap.classList.add('hidden');
      if (accessDenied) accessDenied.classList.add('hidden');
      if (adminNav) adminNav.classList.add('hidden');
      submissionsBody.innerHTML = '';
      allSubmissions = [];
      currentPage = 1;
      authStatus.classList.remove('hidden');
      authStatus.textContent = 'Logged out.';
      loginBtn.classList.remove('hidden');
      logoutBtn.classList.add('hidden');
      refreshBtn.classList.add('hidden');
    });

    window.netlifyIdentity.init({
      APIUrl: 'https://kekauoha-music.netlify.app/.netlify/identity'
    });
  }

  /* ================================================
     Testimonials Management
     ================================================ */
  var addTestimonialBtn = document.getElementById('addTestimonialBtn');
  var testimonialModal = document.getElementById('testimonialModal');
  var closeModal = document.getElementById('closeModal');
  var cancelBtn = document.getElementById('cancelBtn');
  var testimonialForm = document.getElementById('testimonialForm');
  var testimonialsBody = document.getElementById('testimonialsBody');
  var testimonialsContainer = document.getElementById('testimonialsContainer');
  var testimonialsEmpty = document.getElementById('testimonialsEmpty');
  var testimonialsSection = document.getElementById('testimonialsSection');
  var bookingSection = document.getElementById('bookingSection');
  var testimonialAccessDenied = document.getElementById('testimonialAccessDenied');
  var testimonialLogoutBtn = document.getElementById('testimonialLogoutBtn');
  var testimonialLogoutFromDenied = document.getElementById('testimonialLogoutFromDenied');

  var allTestimonials = [];
  var editingTestimonialId = null;

  function openModal() {
    testimonialModal.classList.remove('hidden');
    document.getElementById('testimonialQuote').focus();
  }

  function closeModalWindow() {
    testimonialModal.classList.add('hidden');
    editingTestimonialId = null;
    testimonialForm.reset();
  }

  function showTestimonialError(field, message) {
    var el = document.getElementById(field + 'Error');
    if (el) el.textContent = message;
  }

  function clearTestimonialErrors() {
    document.querySelectorAll('.field-error').forEach(function (el) {
      el.textContent = '';
    });
  }

  function validateTestimonialForm() {
    clearTestimonialErrors();
    var quote = document.getElementById('testimonialQuote').value.trim();
    var author = document.getElementById('testimonialAuthor').value.trim();
    var title = document.getElementById('testimonialTitle').value.trim();
    var location = document.getElementById('testimonialLocation').value.trim();
    var avatar = document.getElementById('testimonialAvatar').value.trim();

    if (!quote) {
      showTestimonialError('quote', 'Quote is required');
      return false;
    }
    if (!author) {
      showTestimonialError('author', 'Author name is required');
      return false;
    }
    if (!title) {
      showTestimonialError('title', 'Title is required');
      return false;
    }
    if (!location) {
      showTestimonialError('location', 'Location is required');
      return false;
    }
    if (!avatar) {
      showTestimonialError('avatar', 'Avatar initials required');
      return false;
    }
    if (avatar.length > 2) {
      showTestimonialError('avatar', 'Max 2 characters');
      return false;
    }
    return true;
  }

  async function saveTestimonial() {
    if (!validateTestimonialForm()) return;

    try {
      var jwtToken = window.netlifyIdentity.currentUser().token.access_token;
      var quote = document.getElementById('testimonialQuote').value.trim();
      var author = document.getElementById('testimonialAuthor').value.trim();
      var title = document.getElementById('testimonialTitle').value.trim();
      var location = document.getElementById('testimonialLocation').value.trim();
      var avatar = document.getElementById('testimonialAvatar').value.trim();
      var published = document.getElementById('testimonialPublished').checked;

      var response = await fetch('/api/admin/testimonials/update', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + jwtToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'add',
          quote: quote,
          author: author,
          title: title,
          location: location,
          avatar: avatar,
          published: published
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save testimonial');
      }

      closeModalWindow();
      loadTestimonials();
    } catch (error) {
      console.error('Error saving testimonial:', error);
      errorBox.textContent = 'Error saving testimonial: ' + error.message;
      errorBox.classList.remove('hidden');
    }
  }

  async function deleteTestimonial(id) {
    if (!confirm('Delete this testimonial? This cannot be undone.')) return;

    try {
      var jwtToken = window.netlifyIdentity.currentUser().token.access_token;
      var response = await fetch('/api/admin/testimonials/update', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + jwtToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete',
          submissionId: id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete testimonial');
      }

      loadTestimonials();
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      errorBox.textContent = 'Error deleting testimonial: ' + error.message;
      errorBox.classList.remove('hidden');
    }
  }

  async function loadTestimonials() {
    try {
      var jwtToken = window.netlifyIdentity.currentUser().token.access_token;
      var response = await fetch('/api/admin/testimonials', {
        headers: { 'Authorization': 'Bearer ' + jwtToken }
      });

      if (response.status === 403) {
        testimonialsContainer.classList.add('hidden');
        testimonialsEmpty.classList.add('hidden');
        testimonialAccessDenied.classList.remove('hidden');
        addTestimonialBtn.classList.add('hidden');
        return;
      }

      if (!response.ok) throw new Error('Network error');
      allTestimonials = await response.json();

      setAdminState();
      renderTestimonials();
    } catch (error) {
      console.error('Error loading testimonials:', error);
    }
  }

  function renderTestimonials() {
    testimonialsBody.innerHTML = '';

    if (!allTestimonials || allTestimonials.length === 0) {
      testimonialsContainer.classList.add('hidden');
      testimonialsEmpty.classList.remove('hidden');
      return;
    }

    testimonialsContainer.classList.remove('hidden');
    testimonialsEmpty.classList.add('hidden');

    allTestimonials.forEach(function (t) {
      var row = document.createElement('tr');
      row.innerHTML =
        '<td class="quote-cell" data-label="Quote">"' + escapeHtml(t.quote).substring(0, 50) + '…"</td>' +
        '<td data-label="Author">' + escapeHtml(t.author) + '</td>' +
        '<td data-label="Title">' + escapeHtml(t.title) + '</td>' +
        '<td data-label="Location">' + escapeHtml(t.location) + '</td>' +
        '<td data-label="Published"><span class="' + (t.published ? 'published-badge' : 'draft-badge') + '">' +
        (t.published ? 'Published' : 'Draft') + '</span></td>' +
        '<td data-label="Action">' +
        '<button class="btn action-btn delete-btn" type="button" data-id="' + escapeHtml(t.id) + '">Delete</button>' +
        '</td>';

      var deleteBtn = row.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', function () {
        deleteTestimonial(t.id);
      });

      testimonialsBody.appendChild(row);
    });
  }

  function escapeHtml(text) {
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
  }

  /* Tab Navigation */
  var navButtons = document.querySelectorAll('.admin-nav-btn');
  navButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var section = this.getAttribute('data-section');
      navButtons.forEach(function (b) {
        b.setAttribute('aria-selected', 'false');
      });
      this.setAttribute('aria-selected', 'true');

      if (section === 'booking') {
        bookingSection.removeAttribute('hidden');
        testimonialsSection.setAttribute('hidden', '');
      } else {
        bookingSection.setAttribute('hidden', '');
        testimonialsSection.removeAttribute('hidden');
        loadTestimonials();
      }
    });
  });

  /* Modal Event Listeners */
  if (addTestimonialBtn) {
    addTestimonialBtn.addEventListener('click', openModal);
  }
  if (closeModal) {
    closeModal.addEventListener('click', closeModalWindow);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeModalWindow);
  }
  if (testimonialForm) {
    testimonialForm.addEventListener('submit', function (e) {
      e.preventDefault();
      saveTestimonial();
    });
  }

  testimonialModal.addEventListener('click', function (e) {
    if (e.target === testimonialModal) {
      closeModalWindow();
    }
  });

  if (testimonialLogoutBtn) {
    testimonialLogoutBtn.addEventListener('click', function () {
      window.netlifyIdentity.logout();
      setTimeout(function() {
        window.location.reload();
      }, 100);
    });
  }

  if (testimonialLogoutFromDenied) {
    testimonialLogoutFromDenied.addEventListener('click', function () {
      window.netlifyIdentity.logout();
      setTimeout(function() {
        window.location.reload();
      }, 100);
    });
  }

  initIdentityHandlers();
}());
