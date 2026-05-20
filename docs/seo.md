# SEO and Analytics Launch Checklist

Zenpho's public website is `https://zenpho.com`. The app subdomain `https://app.zenpho.com` should stay out of search results.

## Environment Variables

Set these in Vercel for Production, then redeploy:

- `NEXT_PUBLIC_SITE_URL=https://zenpho.com`
- `PUBLIC_APP_URL=https://app.zenpho.com`
- `NEXT_PUBLIC_APP_URL=https://app.zenpho.com`
- `NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX`
- `NEXT_PUBLIC_GSC_VERIFICATION=...`
- `NEXT_PUBLIC_BING_VERIFICATION=...`

## Google Search Console

1. Open Google Search Console and add `https://zenpho.com` as a URL-prefix property.
2. Choose the HTML tag verification method.
3. Copy only the `content` value into `NEXT_PUBLIC_GSC_VERIFICATION`.
4. Redeploy the site and click Verify.
5. Submit `https://zenpho.com/sitemap.xml`.
6. Inspect the homepage and request indexing after deploy.

## Google Tag Manager and GA4

1. Create a GTM web container at tagmanager.google.com.
2. Add the container ID to `NEXT_PUBLIC_GTM_ID`.
3. In GTM, add a Google Analytics: GA4 Configuration tag using your GA4 Measurement ID.
4. Fire it on All Pages, preview the container, then publish.
5. Optional conversion triggers already pushed to `window.dataLayer`:
   - `cta_click`
   - `contact_form_submit`
   - `booking_submit`
   - `zenpho_context`

## Bing Webmaster Tools

1. Add `https://zenpho.com` in Bing Webmaster Tools.
2. Use the meta tag verification method.
3. Copy the `msvalidate.01` value into `NEXT_PUBLIC_BING_VERIFICATION`.
4. Redeploy and submit `https://zenpho.com/sitemap.xml`.

## Miami Local SEO

Create a Google Business Profile:

- Name: `Zenpho`
- Category: `Software company`
- Secondary categories: `Website designer`, `Marketing agency`
- Location: city-level Miami, FL if you do not want to publish a street address
- Phone: `(786) 623-5157`
- Website: `https://zenpho.com`

After Google verifies the profile, add Bing Places with the same name, phone, website, and city-level location.
