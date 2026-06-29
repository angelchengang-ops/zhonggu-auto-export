# Netlify Optimization Notes

This site is a static HTML/CSS/JS project, so the main Netlify cost drivers are avoidable deploys, repeated builds, and large asset transfers.

## What was added

- `netlify.toml`
  - Uses a no-op build command.
  - Publishes the site root directly.
  - Runs a build-ignore check before deploy.
- `scripts/netlify-ignore.js`
  - Skips deploys when only docs or report files change.
  - Allows deploys when site code, data, images, videos, or admin media config change.
- `_headers`
  - Caches images, videos, CSS, and JS aggressively.
  - Keeps HTML and JSON uncached so updates appear immediately.
- `.gitignore`
  - Keeps local media staging folders out of future commits.

## How to reduce Netlify credits

1. Avoid deploys for non-site changes.
   - Keep notes, reports, and workflow docs out of deploy-triggering commits when possible.
   - The ignore script skips builds for files such as `README*`, `*_REPORT.md`, `*_TODO.md`, and `.txt`.

2. Keep the build step trivial.
   - This repo does not need a framework build.
   - `netlify.toml` intentionally uses a no-op command instead of `npm run build`.

3. Use versioned static assets.
   - HTML loads `style.css` and `script.js` with version query strings.
   - The browser can cache those files heavily without serving stale content.

4. Cache static assets on Netlify.
   - Images and videos are cached for one year.
   - HTML and JSON remain no-cache so config updates are visible immediately.

5. Prefer WebP for images.
   - Use WebP for new image uploads unless there is a specific compatibility reason not to.
   - Keep the original source only if the quality tradeoff matters.

6. Compress videos before committing.
   - Prefer H.264 MP4 with `faststart` for browser playback.
   - Keep large raw source clips out of Git.
   - Store working media in local staging folders instead of committing every intermediate export.

7. Do not re-upload large binaries unnecessarily.
   - If a video or image has not changed, leave the existing file path in place.
   - Update metadata/configuration instead of replacing binaries when only the active selection changes.

8. Separate documentation changes from asset changes.
   - Docs-only commits should stay small.
   - Asset-heavy commits should be deliberate and batched.

## Suggested workflow

1. Edit site content and config first.
2. Optimize new images to WebP when practical.
3. Compress videos to H.264 MP4.
4. Commit only the assets that actually changed.
5. Let Netlify skip docs-only changes via the ignore script.

## Notes

- This repo currently has no framework build chain, so there is no benefit in adding a second build step.
- If the site ever moves to a framework later, keep the same deploy-ignore idea and add cache headers for the generated asset bundles.

