# Zhonggu Auto Export Domain Binding Guide

## Target setup

- Netlify site: `https://zhonggu-auto-export.netlify.app`
- Primary domain: `https://www.zhongguauto.com`
- Redirect alias: `https://zhongguauto.com`
- Publish directory: `.`
- Entry file: `index.html`

The repository permanently redirects apex-domain requests to the same path on the `www` primary domain.

## Add the domains in Netlify

1. Open the `zhonggu-auto-export` project.
2. Go to **Domain management** > **Production domains**.
3. Select **Add custom domain** and add `www.zhongguauto.com`.
4. Verify ownership if prompted.
5. Confirm Netlify also lists `zhongguauto.com`; Netlify normally adds apex and `www` together.
6. Set `www.zhongguauto.com` as the primary production domain.
7. Keep `zhonggu-auto-export.netlify.app` attached as the Netlify-provided site address.

Assign the domain to this project before changing DNS, preventing conflicts with another Netlify project.

## Configure external DNS

Remove only records that conflict on the same `@` or `www` host. Keep unrelated MX, TXT, and email records.

### WWW

| Type | Host | Value |
| --- | --- | --- |
| CNAME | `www` | `zhonggu-auto-export.netlify.app` |

Some DNS providers expect the target with a trailing dot: `zhonggu-auto-export.netlify.app.`

### Apex/root

Use the preferred option when the DNS provider supports it:

| Type | Host | Value |
| --- | --- | --- |
| ALIAS, ANAME, or flattened CNAME | `@` | `apex-loadbalancer.netlify.com` |

Otherwise use Netlify's fallback:

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `75.2.60.5` |

If Netlify's **Pending DNS verification** dialog shows customized values, use those values. DNS propagation can take up to 24 hours.

## Verify redirects and HTTPS

After DNS propagation:

1. Open `https://zhongguauto.com/` and `https://zhongguauto.com/company.html`.
2. Confirm both return a permanent redirect to the same path at `https://www.zhongguauto.com`.
3. Confirm `https://www.zhongguauto.com/` loads without a redirect loop.
4. In Netlify, open **Domain management** > **HTTPS**.
5. Wait for DNS verification and certificate provisioning.
6. Confirm the certificate covers both hostnames, then enable **Force HTTPS**.
7. Test the site in a private browser window with no certificate warning.

Verify these public URLs:

- `https://www.zhongguauto.com/`
- `https://www.zhongguauto.com/robots.txt`
- `https://www.zhongguauto.com/sitemap.xml`

## Google Search Console

1. Add the Domain property `zhongguauto.com`.
2. Verify ownership with Google's DNS TXT record and keep that record.
3. Open **Sitemaps** for the verified property.
4. Submit `https://www.zhongguauto.com/sitemap.xml` (or `sitemap.xml` if the domain prefix is shown).
5. Confirm Google reports the sitemap as readable.
6. Use **URL inspection** on `https://www.zhongguauto.com/` and request indexing after launch.

## Final checklist

- Netlify primary domain is `www.zhongguauto.com`.
- Apex and `www` are assigned to the same Netlify project.
- `www` points to `zhonggu-auto-export.netlify.app`.
- Apex points to Netlify using the preferred load balancer alias or fallback A record.
- HTTPS covers both hostnames and Force HTTPS is enabled.
- Apex requests redirect to `www` with status `301`.
- Canonical, Open Graph, robots, and sitemap URLs use `https://www.zhongguauto.com`.
- The sitemap is submitted in Google Search Console.

## Official references

- Netlify external DNS: <https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/>
- Google sitemap report: <https://support.google.com/webmasters/answer/7451001>
- Google URL Inspection: <https://support.google.com/webmasters/answer/9012289>
