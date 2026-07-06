## Compatibility review for Podman Desktop interaction with podman VM before, during and after start

## All ansible/ignition/boot scripts PD currently passes to `podman machine init` or `podman machine start`

### 1. Registry Configuration via Ansible Playbook

Before running `podman machine init`, PD renders a mustache template into an ansible playbook YAML file and writes it to a temp directory (`$TMPDIR/podman-desktop/podman-machine/playbook-setup-registry-conf-file.yml`). The playbook creates a symlink inside the VM from `/etc/containers/registries.conf.d/999-podman-desktop-registries-from-host.conf` pointing to the host's `~/.config/containers/registries.conf`. This works because the host's home directory is mounted into the VM (e.g. `/Users` on macOS, `$HOME` on Linux, `/mnt/c/Users/<name>` on Windows via WSL/HyperV), so the symlink target is accessible from within the VM via the mount. On Windows, PD translates the host path (e.g. `C:\Users\Username\.config\containers\registries.conf`) to the VM mount path (`/mnt/c/Users/Username/.config/containers/registries.conf`). This generation step runs on Podman 5.4+, and the resulting file path is then passed as `--playbook <path>` to `podman machine init`. At runtime, PD also verifies via `podman machine ssh` that the symlink actually exists inside the VM's `/etc/containers/registries.conf.d/` before allowing registry configuration changes.

The playbook template:

https://github.com/podman-desktop/podman-desktop/blob/c9afdba13d02a21edcca7443cda7032f317ee330/extensions/podman/packages/extension/src/configuration/playbook-setup-registry-conf-file.mustache#L1-L7

The code that generates and writes this playbook to a temp file:

https://github.com/podman-desktop/podman-desktop/blob/c9afdba13d02a21edcca7443cda7032f317ee330/extensions/podman/packages/extension/src/configuration/registry-configuration.ts#L330-L349

The callsite that passes `--playbook` during `podman machine init`:

https://github.com/podman-desktop/podman-desktop/blob/c9afdba13d02a21edcca7443cda7032f317ee330/extensions/podman/packages/extension/src/extension.ts#L2154-L2161

The SSH check that verifies the symlink exists in the VM:

https://github.com/podman-desktop/podman-desktop/blob/c9afdba13d02a21edcca7443cda7032f317ee330/extensions/podman/packages/extension/src/configuration/registry-configuration.ts#L93-L137

### 2. Rosetta Enable File Provisioning (SSH)

Creates `/etc/containers/enable-rosetta` inside the VM via `podman machine ssh` on macOS Tahoe + ARM64 + AppleHV + Podman 5.6+ to opt into Rosetta x86 emulation. Runs both after machine init and on each machine start.

https://github.com/podman-desktop/podman-desktop/blob/c9afdba13d02a21edcca7443cda7032f317ee330/extensions/podman/packages/extension/src/utils/rosetta.ts#L80-L99

And the post-init provisioning in `extension.ts`:

https://github.com/podman-desktop/podman-desktop/blob/c9afdba13d02a21edcca7443cda7032f317ee330/extensions/podman/packages/extension/src/extension.ts#L2226-L2251

### 3. Rosetta Pre-Start Check (host-side)

Host-side check that verifies Rosetta is actually installed before starting a machine configured to use it. Runs `arch -arch x86_64 uname -m` on the host and prompts the user to install Rosetta or disable support if missing.

https://github.com/podman-desktop/podman-desktop/blob/c9afdba13d02a21edcca7443cda7032f317ee330/extensions/podman/packages/extension/src/utils/rosetta.ts#L137-L168

### 4. Certificate Sync via SSH

Synchronizes host CA certificates into the VM trust store via `podman machine ssh`. Uploads PEM certs to `/etc/pki/ca-trust/source/anchors/`, runs `sudo update-ca-trust`, and restarts `podman.socket` + `podman.service`. Uses incremental diff-based sync.

https://github.com/podman-desktop/podman-desktop/blob/c9afdba13d02a21edcca7443cda7032f317ee330/extensions/podman/packages/extension/src/certificate-sync/podman-certificate-sync.ts#L37-L330

### 5. Proxy Env in containers.conf (host-side write)

Writes `http_proxy`, `https_proxy`, and `no_proxy` environment variables into `~/.config/containers/containers.conf` under the `[engine].env` section. Updates automatically when proxy settings change in Podman Desktop.

https://github.com/podman-desktop/podman-desktop/blob/c9afdba13d02a21edcca7443cda7032f317ee330/extensions/podman/packages/extension/src/utils/podman-configuration.ts#L297-L408

### 6. Machine Provider Settings (host-side write)

Writes `machine.provider` (applehv/libkrun) into `~/.config/containers/containers.conf` to control which VM backend is used for new machine creation.

https://github.com/podman-desktop/podman-desktop/blob/c9afdba13d02a21edcca7443cda7032f317ee330/extensions/podman/packages/extension/src/utils/podman-configuration.ts#L222-L295

---

**All 6 mechanisms live under one directory tree:**

```
extensions/podman/packages/extension/src/
├── configuration/
│   ├── registry-configuration.ts          ← #1 playbook generation + VM check
│   └── playbook-setup-registry-conf-file.mustache  ← #1 playbook template
├── utils/
│   ├── rosetta.ts                         ← #2 Rosetta SSH + #3 pre-start check
│   └── podman-configuration.ts            ← #5 proxy env + #6 provider settings
├── certificate-sync/
│   └── podman-certificate-sync.ts         ← #4 cert sync
└── extension.ts                           ← #1 --playbook callsite + #2 post-init Rosetta SSH
```

## Config files are now natively mounted by Podman 6.0

### Default volume mounts

Podman machine mounts parts of the host filesystem into the VM. The defaults are defined in `containers-common` and have evolved over time:

**macOS** (`default_darwin.go`) — since Podman 4.x:
| Host Path | VM Path |
|---|---|
| `/Users` | `/Users` |
| `/private` | `/private` |
| `/var/folders` | `/var/folders` |

**Linux** (`default_linux.go`) — since Podman 4.x:
| Host Path | VM Path |
|---|---|
| `$HOME` | `$HOME` |

**Windows** — depends on the machine provider:

- **WSL** (default on Windows, Podman 4.x+): all host drives are automatically mounted at `/mnt/<letter>` by WSL itself — this is a WSL feature, not Podman's `--volume` flag. `getDefaultMachineVolumes()` returns empty.
- **HyperV** (Podman 4.7+): volume mounts were added incrementally:

| Podman Version | Mounts                                                                       |
| -------------- | ---------------------------------------------------------------------------- |
| v4.7 – v4.9    | None (empty)                                                                 |
| v5.0 – v5.2    | Home dir only: `C:\Users\<name>` → `/Users/<name>`                           |
| v5.3+          | Home dir + drive root: `C:\Users\<name>` → `/Users/<name>`, `C:\` → `/mnt/c` |

The HyperV mounts mimic WSL behavior so the same paths work regardless of provider (comment in code: "It is executed only if the machine provider is Hyper-V and it mimics WSL behavior").

### New in Podman 6.0: config directory mount

Podman 6.0 adds one additional volume mount on all platforms — the host's user config directory is mounted over `/etc/containers/` inside the VM:

| Platform      | Host Path               | VM Path            |
| ------------- | ----------------------- | ------------------ |
| macOS / Linux | `~/.config/containers/` | `/etc/containers/` |
| Windows       | `%APPDATA%\containers\` | `/etc/containers/` |

This is configured in `containers-common` (`vendor/go.podman.io/common/pkg/config/default.go`):

https://github.com/containers/podman/blob/v6.0.0/vendor/go.podman.io/common/pkg/config/default.go#L277-L287

This means every file in the host's config directory — `containers.conf`, `registries.conf`, `registries.conf.d/`, `policy.json`, `certs.d/` — is directly visible at `/etc/containers/` inside the VM without needing symlinks or playbooks.

**Important caveat:** because this is an overmount, the VM's original `/etc/containers/` contents from the Fedora CoreOS image (including the distro-provided `registries.conf`, `policy.json`, and `storage.conf`) are **hidden**. Only files that exist on the host side will appear in the VM. If the host's `~/.config/containers/` does not contain a `registries.conf`, the VM will not have one either — Podman falls back to compiled-in defaults. (See [Registry Configuration via Ansible Playbook](https://github.com/podman-desktop/podman-desktop/issues/17148#issuecomment-4871002569))

## Custom scripts that can be removed

**#1 — Registry Configuration via Ansible Playbook.** The playbook creates a symlink inside the VM so that the host's `registries.conf` is visible at `/etc/containers/registries.conf.d/`. With Podman 6.0's native overmount of `~/.config/containers/` → `/etc/containers/`, the host's `registries.conf` and `registries.conf.d/` are already directly visible inside the VM. The playbook, the mustache template, the `--playbook` flag in the `podman machine init` call, and the SSH symlink verification check can all be removed for Podman 6.0+.

Caveat: the overmount hides the distro-provided `registries.conf` from the Fedora CoreOS image. If the host's `~/.config/containers/registries.conf` does not exist, the VM will have no `registries.conf` at all (Podman does not auto-create one — it falls back to compiled-in defaults with no `unqualified-search-registries`). PD may need to ensure a `registries.conf` exists on the host before `podman machine init`.

**#4 — Certificate Sync via SSH.** Podman 6.0 introduced the `--import-native-ca` flag for `podman machine init`, which natively imports host CA certificates into the VM trust store. This replaces the custom SSH-based cycle of uploading PEM certs to `/etc/pki/ca-trust/source/anchors/`, running `update-ca-trust`, and restarting `podman.socket` + `podman.service`.

## Scripts that must remain for PD-specific functionality

**#2 — Rosetta Enable File Provisioning (SSH).** Creates `/etc/containers/enable-rosetta` inside the VM via `podman machine ssh`. Rosetta enablement is a per-machine decision (only ARM64 Macs with AppleHV), not a host-wide config setting. With the Podman 6.0 overmount, writing this file to the host's `~/.config/containers/enable-rosetta` would affect all machines and would also appear on non-macOS hosts — wrong semantics. The SSH approach remains correct unless Podman upstream adds a dedicated `--rosetta` flag to `podman machine init`. **Keep as-is.**

**#3 — Rosetta Pre-Start Check (host-side).** Runs entirely on the host to verify Rosetta is installed before starting a machine. Has no interaction with the VM filesystem or config files. Unaffected by Podman 6.0 changes. **Keep as-is.**

**#5 — Proxy Env in containers.conf (host-side write).** Writes proxy environment variables to `~/.config/containers/containers.conf` on the host. This is a host-side file write — no SSH, no playbooks, no VM interaction. The mechanism is identical regardless of Podman version. **Keep as-is.**

**#6 — Machine Provider Settings (host-side write).** Writes `machine.provider` to `~/.config/containers/containers.conf` on the host. This setting is consumed by `podman machine init` on the host side. Has no VM interaction. **Keep as-is.**

## Regression: lost `registries.conf` and `policy.json` due to Podman 6.0 overmount

### Problem

Podman 6.0 mounts the host's `~/.config/containers/` over `/etc/containers/` inside the VM. This is an overmount — it completely hides the original contents of the VM's `/etc/containers/` directory, which on Fedora CoreOS includes distro-provided files installed by the `containers-common` RPM:

- `/etc/containers/registries.conf` — defines `unqualified-search-registries` (e.g. `docker.io`, `quay.io`, `registry.fedoraproject.org`, `registry.access.redhat.com`)
- `/etc/containers/registries.conf.d/000-shortnames.conf` — maps hundreds of short image names (e.g. `python` → `docker.io/library/python`)
- `/etc/containers/policy.json` — image trust/signature verification policy
- `/etc/containers/registries.d/default.yaml` — signature verification configuration
- `/etc/containers/registries.d/registry.redhat.io.yaml`, `registry.access.redhat.com.yaml` — Red Hat registry signature configs

These are real files (not symlinks) installed by the RPM and managed by OSTree's 3-way merge on Fedora CoreOS. After the overmount, only files that exist in the host's `~/.config/containers/` are visible at `/etc/containers/` inside the VM.

### Impact

On a typical developer workstation, `~/.config/containers/` contains only `containers.conf` (if PD has written proxy or provider settings) and possibly `auth.json`. It does **not** contain `registries.conf`, `policy.json`, or any of the `registries.d/` or `registries.conf.d/` files.

This also means any custom registries that the user or PD had previously configured inside the VM's `registries.conf` on Podman 5.x (either directly in `/etc/containers/registries.conf` or via drop-in files in `/etc/containers/registries.conf.d/`) are lost after upgrading to Podman 6.0. The overmount replaces the entire `/etc/containers/` directory, so per-VM customizations made via SSH or the Ansible playbook no longer persist.

After `podman machine init` with Podman 6.0:

1. **No `registries.conf`** — the Fedora CoreOS VM originally ships with `unqualified-search-registries = ["registry.fedoraproject.org", "registry.access.redhat.com", "docker.io"]` in `/etc/containers/registries.conf`. The `unqualified-search-registries` setting defines which registries Podman tries, in order, when the user specifies an image by short name (e.g. `nginx` instead of `docker.io/library/nginx`). This is hidden by the overmount of the host's `~/.config/containers/` (which typically has no `registries.conf`). Podman has no compiled-in default registries — when no `registries.conf` is found at any search path, the `UnqualifiedSearchRegistries` list is simply empty (the `containers/image` library initializes it as `nil` and never populates it with hardcoded values).

   **Effect on Podman Desktop UI:** Podman Desktop uses the Docker-compatible REST API (`/images/create` via Dockerode) for image pulls. Podman's compat API has a built-in setting `compat_api_enforce_docker_hub` (default: `true`) which forces all short names to resolve to `docker.io`, completely bypassing `unqualified-search-registries` and short-name aliases. This means pulling `nginx` from PD's Images page will still work — it resolves to `docker.io/library/nginx` regardless of whether `registries.conf` exists.

   However, the missing `unqualified-search-registries` **does** affect: (a) `podman pull` on the host CLI (uses the native libpod API, not compat), (b) `podman pull` via SSH inside the VM, (c) `podman build` / Containerfile `FROM` directives that reference short names like `FROM python:3.12`, and (d) any tool or workflow that calls the Podman libpod API directly. These will fail with a "short-name resolution" error unless the user types fully-qualified names like `docker.io/library/python:3.12`.

2. **No `000-shortnames.conf`** — the short-name alias table that maps common image names to their fully-qualified registries is missing.

3. **No `policy.json`** — Podman does **not** have a compiled-in fallback policy. If no `policy.json` is found at any search path, Podman refuses all image operations entirely (see [containers/podman#21855](https://github.com/containers/podman/issues/21855)). The Fedora CoreOS `policy.json` contains `{"default":[{"type":"insecureAcceptAnything"}]}` which permits pulling any image. Without it, **all** image pulls fail — even fully-qualified names. In Podman Desktop this surfaces as: `Error while pulling image from podman-machine-default: access to image "docker.io/node" is denied (500 error)`. This is more severe than the `registries.conf` issue because it blocks every pull, not just short names.

4. **No `registries.d/` configs** — Red Hat registry signature verification is not configured.

Podman's config file search path checks `~/.config/containers/` → `/etc/containers/` → `/usr/share/containers/`. Since the overmount makes path #2 show the host's (mostly empty) config directory, and `/usr/share/containers/` does not ship `registries.conf` (only `containers.conf` and `storage.conf`), there is no fallback.

### Who is affected

Any user running Podman 6.0+ with `podman machine` on macOS, Linux, or Windows where the host's `~/.config/containers/` does not contain a `registries.conf`. This is the common case for most users who have never manually created one.

### Possible mitigations

1. **PD creates a default `registries.conf` on the host** — before calling `podman machine init`, PD could check whether `~/.config/containers/registries.conf` exists and, if not, create one with the standard Fedora unqualified-search-registries (`docker.io`, `quay.io`, etc.). This would then be visible inside the VM via the overmount.

2. **PD copies distro defaults to the host config directory** — PD could ship or download the full set of default config files (`registries.conf`, `policy.json`, `000-shortnames.conf`) and place them in `~/.config/containers/` so the overmount presents a complete `/etc/containers/` inside the VM.

3. **Upstream fix in Podman** — Podman could change the overmount to use an overlay mount instead of a bind mount, so that files from both the host config directory and the VM's original `/etc/containers/` are visible. Alternatively, Podman could auto-populate the host config directory with distro defaults during `podman machine init` if they are missing.

4. **Keep the Ansible playbook for Podman 6.0** — if the overmount issue is not resolved upstream, PD could continue using the playbook mechanism on Podman 6.0 to work around the missing files, though this would require the playbook to run after the overmount is active (i.e., at machine start rather than init).
