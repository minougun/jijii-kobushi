# Switch SDK / Unity Module Preparation

Date: 2026-05-05

Local repo: `/mnt/c/Users/minou/jii-kobushi`
Web URL: `https://minougun.github.io/jijii-kobushi/`
GitHub: `https://github.com/minougun/jijii-kobushi`
Unity project: `/mnt/c/Users/minou/jii-kobushi/switch-port/unity-stage1-prototype/UnityProject`

## Scope

This document is intentionally NDA-safe. Do not paste Nintendo SDK names, portal URLs beyond the public developer portal, license keys, certificates, dev kit serials, package ids, or private forum text into this repo.

## Public References

- Nintendo Developer Portal: `https://developer.nintendo.com/`
- Unity for Nintendo Switch: `https://unity.com/solutions/nintendo-switch`
- Unity Hub CLI manual: `https://docs.unity3d.com/hub/manual/HubCLI.html`

Unity states publicly that Nintendo Switch is a closed console platform flow and that developers need Nintendo approval plus an active Unity Pro subscription or a Preferred Platform license key from the platform holder to access the build modules.

## Detected Local Environment

Unity Hub detected installed Editors:

- `2022.3.62f3` at `C:\Program Files\Unity\Hub\Editor\2022.3.62f3\Editor\Unity.exe`
- `6000.4.5f1` at `C:\Program Files\Unity\Hub\Editor\6000.4.5f1\Editor\Unity.exe`

Current prototype ProjectVersion:

- `2022.3.62f3`

Use `2022.3.62f3` first unless the Nintendo/Unity platform package explicitly requires a different editor version.

## Preparation Steps

1. In Nintendo Developer Portal, confirm the approved account can access:
   - Switch development documentation.
   - Hardware/dev kit ordering or assignment flow.
   - Unity platform add-on/package instructions.
   - Submission/checklist documentation.

2. Confirm the Unity license path:
   - Unity Pro subscription, or
   - Preferred Platform license key provided through the approved platform flow.

3. Install or associate the Switch platform support module for the selected Unity Editor.
   - Do this only using Nintendo/Unity official instructions available after approval.
   - Do not commit downloaded SDK/module files to this repository.
   - Do not paste private module ids, package names, URLs, keys, or forum text into this repository.

4. Open the local prototype:
   - `C:\Users\minou\jii-kobushi\switch-port\unity-stage1-prototype\UnityProject`

5. After the platform module appears in Unity, create a local-only Switch build profile or build settings.
   - Keep generated files and platform-specific private configuration out of Git unless they are confirmed safe to track.
   - Secrets, certs, keys, device ids, and SDK paths must remain local.

6. Run the current local completion gate before changing platform build settings:

   ```bash
   npm run check:switch-local-complete
   ```

7. After platform module setup, run the same gate again.
   - Expected: current Windows/local smoke still passes.
   - Any platform-specific failures should be isolated to the new Switch build profile, not the Web original or portable data.

## Local Commands

List installed Unity Editors:

```bash
"/mnt/c/Program Files/Unity Hub/Unity Hub.exe" -- --headless editors -i
```

Unity Hub module installation help:

```bash
"/mnt/c/Program Files/Unity Hub/Unity Hub.exe" -- --headless help install-modules
```

Do not run a Switch module install command from public notes. Use the exact command or installer flow from the approved Nintendo/Unity documentation.

## Dev Kit Bring-up Checklist

- Dev kit appears in the official device tooling.
- Unity can see the Switch build target/module.
- A blank or minimal Unity scene can build/deploy to the dev kit.
- `Stage1Prototype.unity` can build/deploy after the blank-scene sanity check.
- Controller input is mapped from platform controls to the existing logical actions:
  - tap/mash
  - hold down/up
  - pause
  - restart
  - save
  - load
- Save data writes through an `IRunSaveStore` implementation that can later replace `FileRunSaveStore`.
- ED video/audio plays on hardware or has a platform-approved transcode path.
- Handheld and TV modes keep the rhythm lane readable.
- Suspend/resume, HOME, controller disconnect, and storage-full cases are tested.

## Repository Safety

Do not commit:

- Nintendo SDK files.
- Unity closed-platform modules.
- License keys.
- Certificates.
- Device serials.
- Portal screenshots.
- Private documentation excerpts.
- Generated build outputs.

`Issue/PR: not_applicable` for this local preparation note unless a GitHub issue is created later.
