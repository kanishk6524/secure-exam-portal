# Secure Exam Client

A locked-down desktop app (Electron) that opens **only** the exam portal. It is the "installed system" layer:
a web page alone cannot see or control the rest of the computer, this app can.

## What it does

| Protection | How |
| --- | --- |
| Kiosk | Fullscreen, always-on-top, no menu, no minimise; cannot be closed until the exam is submitted |
| Shortcuts | Blocks reload, close, new window, print, save, find, devtools (F12, Ctrl+Shift+I/J/C), Alt+F4 |
| Focus | Taking focus away (Alt+Tab etc.) is reported to the portal and focus is taken back |
| Screenshots / recording | `setContentProtection(true)`: captures of the window come out black (Windows, macOS) |
| Extra monitors | Checked before the exam, every 8 s during it, and on "display added" |
| Prohibited apps | Remote-access tools, screen recorders, chat/meeting apps, AI assistants (list in `config.json`) |
| Virtual machines | VMware, VirtualBox, QEMU/KVM, Hyper-V, Parallels, hypervisor flag on macOS |
| Clipboard | Cleared every 2 s |
| Navigation | Only the exam origin loads; pop-ups denied; only camera/microphone/fullscreen permissions granted |
| Preflight | Student sees a checklist; the exam portal only opens when the machine is clean |
| Client proof | Every request carries a signed `X-Secure-Client` header the portal can require |

Findings during the exam are sent to the portal (`MULTIPLE_MONITORS` / `CLIENT_INTEGRITY` incidents). They count
towards the auto-submit limit and appear in **Admin → Monitoring** and **Incident Review**.

## Run it (development)

```bash
cd desktop-client
npm install
SECURE_CLIENT_DEV=1 EXAM_URL=http://localhost:3000 npm start     # normal window, devtools allowed
```

`SECURE_CLIENT_DEV=1` turns the kiosk off so you can test; the checks still run (stop OBS/Zoom/Claude first or
remove them from `blockedProcesses` in `config.json`).

## Make the portal require it

In the portal's `.env`:

```
REQUIRE_SECURE_CLIENT=1
SECURE_CLIENT_SECRET=<long random string>
```

Put the same secret in the client (`SECURE_CLIENT_SECRET` env var or `config.json` → `secret`).
With this on, `POST /api/exams/:id/start` and the questions endpoint reject normal browsers.

## Build an installer

```bash
npm run dist          # outputs to desktop-client/dist (NSIS .exe, .dmg or AppImage, for the OS you build on)
```

Build a separate installer per OS. Set `examUrl`, `secret` and `invigilatorPin` in `config.json` before building.

## Invigilator exit

`Ctrl/Cmd + Shift + Alt + Q` opens a PIN prompt (needs `invigilatorPin`). Without a PIN configured there is no
emergency exit other than finishing the exam.

## Honest limits

* The shared secret lives inside the app. A determined attacker can extract it, so treat `REQUIRE_SECURE_CLIENT`
  as a strong deterrent, not proof. Real tamper-proofing needs managed devices (MDM) or hardware attestation.
* Alt+Tab, the Windows key and Ctrl+Alt+Del are OS-level: the app cannot disable them, it detects focus loss,
  takes focus back and reports it. Fully blocking them requires a Windows kiosk profile / assigned-access policy.
* Process and VM checks are by name and by hardware strings; a renamed tool or a hardened VM can evade them.
* A second person or a phone *outside* the camera's view cannot be seen by software. That is what the room
  invigilator and the webcam evidence review are for.
* Screenshots from another camera pointed at the screen cannot be prevented (the watermark makes leaks traceable).
