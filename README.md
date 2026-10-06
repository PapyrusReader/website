# Papyrus website

Public landing page for [Papyrus](https://github.com/PapyrusReader/papyrus), a free, open-source book library and reader. The website introduces the library, reading and optional sync features, presents the intended product feature set and format support, and directs visitors to the web app and Windows/Linux downloads.

## Getting Started

```bash
npm ci
npm run dev
```

This starts a local server at `http://localhost:8090` with live SCSS recompilation. JavaScript source files run directly; refresh after editing them.

Build deployable assets with `npm run build`; output is written to `build/`.

## Design and assets

Product copy presents the core product requirements in present tense, rather
than acting as a released-feature checklist. Its source is the project docs'
`index.rst` and `requirements/functional.rst`: library organization and search,
imports and metadata, reading, annotations, exports, goals, storage and sync.
Speculative advanced ideas such as AI features and audiobooks are not included.

The website uses the client's purple identity with light/dark surfaces. It follows
`prefers-color-scheme` until a visitor chooses a theme, then saves that choice in
`papyrus-theme`. Legacy gold/purple choices migrate to light/dark. The small theme
script loads before the stylesheet to avoid showing the wrong theme initially.
Without JavaScript, the system theme, navigation, screenshot and download links
remain usable. Reduced-motion preferences disable smooth scrolling.

Brand SVGs in `public/img/` are copied from the client's `public/img/` assets.
The library screenshot is the original client README image, with local WebP
variants at 640, 1280, 1920 and 2560 pixels. The full-resolution PNG is available
through the enlargement link and is the social preview image. It always shows
the real dark-mode app, independent of the website theme. Favicons use the
canonical emblem from the client's `app/assets/images/logo-icon-light.svg`.
These are checked-in assets; website builds do not need the client repository
or image-generation tools.

Run `npm test` for the focused theme preference checks and `npm run build` for
the static build. Review both themes at 320, 390, 720, 900, 1440 and 1920 pixels,
including keyboard navigation, 200% zoom, reduced motion and JavaScript disabled.

## Releases and production deployment

The public website is served at `https://papyrus-reader.com`; `www` redirects
there. It runs in its own `papyrus-website` Compose project on the Hetzner VM,
separate from the app services. The shared `papyrus-edge` proxy owns ports 80/443
and routes website traffic to `papyrus-website:8080` over the external Docker
network. The Flutter app remains at `https://app.papyrus-reader.com`.
Website versions in `package.json` are independent of client/server versions.

An administrator installs `deploy/compose.yml` at
`/srv/apps/papyrus-website/compose.yml` and creates `site/` there, owned by the
dedicated upload account. After installing the first static build into
`site/releases/<commit>` and linking `site/current` to that relative path, run
`docker compose -f compose.yml up -d --wait` from this directory. The shared
proxy/network must be provisioned first from the workspace's `deploy/edge`
runbook. Website containers publish no host ports. They do not join the app's
private network or mount its files.

Run `npm version patch --no-git-tag-version` to update `package.json` and
`package-lock.json`, then include both files in the website pull request.
After merging into `master`, **Website release** builds only when that version
increases. It verifies and deploys the archive, checks the public build revision,
then publishes a GitHub release with its SHA-256 checksum. Run the workflow
manually from `master` for the initial release or to retry the same version.
A tag already belonging to a different commit requires a new website version.

The repository's `production` GitHub environment needs:

| Setting | Kind | Value |
| --- | --- | --- |
| `WEBSITE_SSH_HOST` | Variable | Hetzner server address |
| `WEBSITE_SSH_USER` | Variable | Dedicated `papyrus-website` user |
| `WEBSITE_SSH_KNOWN_HOSTS` | Variable | SSH host key verified through the existing administrator connection |
| `WEBSITE_SSH_PRIVATE_KEY` | Secret | Dedicated website upload key |

Allow only `master` to deploy through that environment. The deployment account
owns `/srv/apps/papyrus-website/site` and has no sudo or Docker access. The
website's own container mounts that directory read-only. Each deployment validates the
archive checksum, revision and required assets before atomically switching the
relative `current` symlink to `releases/<commit>`. Previous releases remain
available for rollback; switch `current` back to an earlier relative release
path without restarting any container. The app Compose project is not involved
in website deployments; app releases do not restart the website or shared proxy.

Run the focused automation checks with
`python3 -m unittest discover -s scripts/tests -v`. Normal website CI also builds
the static assets; it never deploys pull requests.
