# Papyrus website

Landing page for the [Papyrus](https://github.com/PapyrusReader/papyrus) project - a free, open-source e-book reader and library manager for Android, iOS, Windows, macOS, Linux, and Web.

## Getting Started

```bash
npm ci
npm run dev
```

This starts a local server at `http://localhost:8090` with live SCSS recompilation.

Build deployable assets with `npm run build`; output is written to `build/`.

## Releases and production deployment

The public website is served by Caddy at `https://papyrus-reader.com`; `www`
redirects there. The Flutter app remains at `https://app.papyrus-reader.com`.
Website versions in `package.json` are independent of client/server versions.

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
owns `/srv/apps/papyrus/deploy/website` and has no sudo or Docker access. The
server's Caddy mounts that directory read-only. Each deployment validates the
archive checksum, revision and required assets before atomically switching the
relative `current` symlink to `releases/<commit>`. Previous releases remain
available for rollback; switch `current` back to an earlier relative release
path without restarting Caddy. Keep `website/` separate from the Flutter `web/`
directory and from server credentials.

Run the focused automation checks with
`python3 -m unittest discover -s scripts/tests -v`. Normal website CI also builds
the static assets; it never deploys pull requests.
