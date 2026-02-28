# KekauohaMusic
Official hub for Kekauoha Music. Featuring lesson bookings, studio policies, pricing, and professional references for prospective students and collaborators.

## Production Setup

### 1) Enable Live Booking Submissions (Netlify Forms)
1. Deploy this site on Netlify.
2. Keep the booking form attributes in `index.html`:
	- `name="booking-request"`
	- `method="POST"`
	- `data-netlify="true"`
	- `data-netlify-honeypot="bot-field"`
3. After deploy, open Netlify Dashboard → Forms and confirm `booking-request` is detected.
4. Add Netlify notifications (email/Slack/webhook) for new submissions.
5. Submit one real test booking from the live site to initialize form data.

The booking form currently includes:
- Client-side validation
- Netlify-compatible honeypot field
- Minimum-time submit check to reduce bot traffic

### 2) Owner Dashboard (Netlify-only)

An admin dashboard is available at `/admin` for non-technical management of booking requests.

Features:
- View booking submissions
- Update request status (`new`, `contacted`, `booked`, `closed`)
- Save private owner notes

How it works:
- Submissions are read via Netlify Functions using Netlify API
- Status + notes are persisted to a Netlify form named `booking-updates`
- No external database or third-party API is required

#### Netlify Dashboard setup required
1. Enable Identity: Netlify Dashboard → Identity → Enable Identity.
2. Disable open signup (recommended): set registration to Invite only.
3. Invite the site owner as a user.
4. Add environment variables in Netlify Dashboard → Site settings → Environment variables:
	- `NETLIFY_API_TOKEN` (Personal Access Token with access to the site)
	- `NETLIFY_SITE_ID` (Site ID from Site details)
5. Redeploy site.

After deployment:
- Go to `/admin`
- Log in with the invited owner account
- Manage bookings directly from the dashboard

### 2) Enable Google Analytics 4
1. Create a GA4 property and copy your measurement ID (example: `G-123ABC456D`).
2. In `index.html`, set:

```html
window.KM_CONFIG = {
	ga4MeasurementId: 'G-123ABC456D'
};
```

Tracked events:
- `generate_lead` (successful booking submit)
- `generate_lead` with `booking_form_invalid` label
- `booking_submit_error`
- `booking_spam_blocked`

### 3) Netlify Functions + Redirects

Configured in `netlify.toml`:
- `/api/admin/submissions` → `/.netlify/functions/submissions-list`
- `/api/admin/submissions/update` → `/.netlify/functions/submissions-update`

### 4) Domain + Security
- Point a custom domain to your host.
- Enable HTTPS/SSL.
- Add security headers at hosting layer (CSP, HSTS, X-Frame-Options, Referrer-Policy).

### 5) SEO + Indexing
- Add `sitemap.xml` and `robots.txt` at project root.
- Keep Open Graph/Twitter metadata accurate in `index.html`.
- Submit sitemap in Google Search Console.

### 6) Launch QA Checklist
- Test booking form success + failure paths.
- Test owner dashboard login + status/notes save flow.
- Test mobile nav and all section links.
- Run Lighthouse checks for Accessibility, Best Practices, SEO, and Performance.
- Confirm contact email/phone and testimonial content are real/final.
