# Live2D maintenance

## Active resource chain

GitHub `giraffishh/image-hosting/live2d/` -> existing SUSTech mirror `giraffish/image-hosting/live2d/` -> blog loader.

The footer in `_config.fluid.yml` loads `/js/live2d-loader.js`. Its `data-assets` attribute pins the SUSTech Raw URL to a Git commit. All runtime files, CSS, model JSON, textures and motions come from that one directory.

GitLab Raw deliberately responds to JS/CSS with `text/plain` and `nosniff`. The small local loader fetches these CORS-enabled assets, checks SHA-256 SRI for the four runtime/style files, and uses explicit JavaScript Blob URLs and an inline style element. It does not use eval or change response/security headers. The existing widget then fetches model JSON and textures directly from the mirror. No CSP weakening was added. A future restrictive CSP must account for this loader or use a CDN that returns the correct MIME types.

## Migration provenance (2026-10-31)

- Original GitHub source: `giraffishh/live2d-widget`, commit `7021eff494733dfa264c3cd5ab4ca44e29fcef00`.
- OSS `live2d-widget/` was a duplicate runtime copy. Styles, widget bundle, tips and Cubism 2 runtime matched the local source copy. Production Cubism Core differed and was preserved in the consolidated bundle.
- The original repository and OSS objects remain as backups; the active bundle is maintained in `image-hosting/live2d/`.
- Models and their source/licensing files were retained. All 17 model-list entries and their referenced local assets were checked.
- The widget bundle includes PixiJS 6; the separate footer PixiJS 7 script was removed.
- Script loading is ordered: Cubism Core -> Live2D runtime -> widget bundle -> widget initialization.
- Desktop-only behavior is preserved. The Hitokoto button still calls its quotation API; it is not a static asset.

## Updates and rollback

1. Edit the published bundle in `image-hosting/live2d/` and push to GitHub.
2. Run the existing `C:\Users\giraf\sync-image-hosting.ps1` workflow. Verify GitHub and SUSTech contain the same revision.
3. Verify file hashes/MIME/CORS and the model references. For changed JS/CSS, recompute the four SHA-256 SRI values from the committed Git blobs, not a CRLF working copy.
4. Update the footer `data-assets` revision and the loader SRI values together.
5. Generate Hexo and browser-test initial display, switch-model and switch-texture before publishing the blog.

To revert an application change, revert its Git commit and let normal Git continuous deployment publish the fix. Do not delete the old revision of assets.
