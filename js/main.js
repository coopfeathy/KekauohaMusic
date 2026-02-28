/* Kekauoha Music — main.js */
(function () {
  'use strict';

  /* ================================================
     Year in footer
     ================================================ */
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* ================================================
     Mobile nav toggle
     ================================================ */
  var navToggle = document.getElementById('navToggle');
  var navMenu   = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      var isOpen = navMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    /* Close nav when a link is clicked (mobile) */
    navMenu.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        navMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });

    /* Close nav when clicking outside */
    document.addEventListener('click', function (e) {
      if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
        navMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ================================================
     Active nav link on scroll
     ================================================ */
  var sections = document.querySelectorAll('section[id]');
  var navLinks  = document.querySelectorAll('.nav-link[href^="#"]');

  function onScroll () {
    var scrollY = window.scrollY || window.pageYOffset;
    var active  = null;

    sections.forEach(function (section) {
      var offsetTop = section.offsetTop - 90;
      if (scrollY >= offsetTop) {
        active = section.id;
      }
    });

    navLinks.forEach(function (link) {
      var href = link.getAttribute('href').replace('#', '');
      if (href === active) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ================================================
     Booking form — client-side validation & submit
     ================================================ */
  var form       = document.getElementById('bookingForm');
  var submitBtn  = document.getElementById('submitBtn');
  var successMsg = document.getElementById('formSuccess');
  var errorMsg   = document.getElementById('formErrorMsg');

  if (!form) return;

  var startedAtField = document.getElementById('kmStartedAt');
  if (startedAtField) {
    startedAtField.value = String(Date.now());
  }

  function trackEvent (eventName, eventParams) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, eventParams || {});
  }

  /* Required text/select fields and their error element IDs */
  var requiredFields = [
    { id: 'firstName',  errorId: 'firstNameError',  label: 'First name' },
    { id: 'lastName',   errorId: 'lastNameError',   label: 'Last name' },
    { id: 'email',      errorId: 'emailError',      label: 'Email address' },
    { id: 'instrument', errorId: 'instrumentError', label: 'Instrument / Program' },
    { id: 'level',      errorId: 'levelError',      label: 'Experience level' },
  ];

  function clearErrors () {
    requiredFields.forEach(function (f) {
      var el  = document.getElementById(f.id);
      var err = document.getElementById(f.errorId);
      if (el)  { el.removeAttribute('aria-invalid'); }
      if (err) { err.textContent = ''; }
    });

    var policiesEl  = document.getElementById('agreeToPolicy');
    var policiesErr = document.getElementById('policiesError');
    if (policiesEl)  { policiesEl.removeAttribute('aria-invalid'); }
    if (policiesErr) { policiesErr.textContent = ''; }
  }

  function validateEmail (value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validateForm () {
    var valid = true;
    var firstInvalid = null;

    requiredFields.forEach(function (f) {
      var el  = document.getElementById(f.id);
      var err = document.getElementById(f.errorId);
      if (!el || !err) return;

      var value = el.value.trim();

      if (!value) {
        err.textContent = f.label + ' is required.';
        el.setAttribute('aria-invalid', 'true');
        valid = false;
        if (!firstInvalid) firstInvalid = el;
      } else if (f.id === 'email' && !validateEmail(value)) {
        err.textContent = 'Please enter a valid email address.';
        el.setAttribute('aria-invalid', 'true');
        valid = false;
        if (!firstInvalid) firstInvalid = el;
      }
    });

    /* Policies checkbox */
    var policiesEl  = document.getElementById('agreeToPolicy');
    var policiesErr = document.getElementById('policiesError');
    if (policiesEl && policiesErr && !policiesEl.checked) {
      policiesErr.textContent = 'Please agree to the Studio Policies to continue.';
      policiesEl.setAttribute('aria-invalid', 'true');
      valid = false;
      if (!firstInvalid) firstInvalid = policiesEl;
    }

    if (firstInvalid) {
      firstInvalid.focus();
    }

    return valid;
  }

  function isLikelySpam () {
    var honeypot = document.getElementById('botField');
    if (honeypot && honeypot.value.trim() !== '') {
      return true;
    }

    if (!startedAtField || !startedAtField.value) {
      return false;
    }

    var started = Number(startedAtField.value);
    if (!Number.isFinite(started)) {
      return false;
    }

    var elapsedMs = Date.now() - started;
    return elapsedMs < 2500;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    clearErrors();
    successMsg.hidden = true;
    errorMsg.hidden   = true;

    if (!validateForm()) {
      trackEvent('generate_lead', {
        event_category: 'engagement',
        event_label: 'booking_form_invalid'
      });
      return;
    }

    if (isLikelySpam()) {
      errorMsg.textContent = 'Unable to submit right now. Please refresh and try again.';
      errorMsg.hidden = false;
      trackEvent('booking_spam_blocked', {
        event_category: 'security'
      });
      return;
    }

    /* Simulate async submission (replace with real endpoint as needed) */
    var btnText    = submitBtn.querySelector('.btn-text');
    var btnSpinner = submitBtn.querySelector('.btn-spinner');

    submitBtn.disabled   = true;
    btnText.textContent  = 'Sending…';
    btnSpinner.hidden    = false;

    fetch('/', {
      method: 'POST',
      body: new URLSearchParams(new FormData(form)).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Request failed');
        }

        successMsg.hidden = false;
        form.reset();
        if (startedAtField) {
          startedAtField.value = String(Date.now());
        }

        trackEvent('generate_lead', {
          event_category: 'conversion',
          event_label: 'booking_form_submitted'
        });

        successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      })
      .catch(function () {
        errorMsg.textContent = 'Something went wrong. Please try again or email us directly at info@kekauohamusic.com.';
        errorMsg.hidden = false;

        trackEvent('booking_submit_error', {
          event_category: 'error'
        });
      })
      .finally(function () {
        submitBtn.disabled   = false;
        btnText.textContent  = 'Send Booking Request';
        btnSpinner.hidden    = true;
      });
  });

  /* Clear per-field error on input */
  requiredFields.forEach(function (f) {
    var el  = document.getElementById(f.id);
    var err = document.getElementById(f.errorId);
    if (!el || !err) return;
    el.addEventListener('input', function () {
      err.textContent = '';
      el.removeAttribute('aria-invalid');
    });
  });

  var policiesEl = document.getElementById('agreeToPolicy');
  if (policiesEl) {
    policiesEl.addEventListener('change', function () {
      var err = document.getElementById('policiesError');
      if (err) { err.textContent = ''; }
      policiesEl.removeAttribute('aria-invalid');
    });
  }

}());
