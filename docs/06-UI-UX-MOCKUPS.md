# MyRemote - UI/UX Maquettes

**Version**: 1.0
**Date**: 2026-01-22
**Framework**: Next.js 14 + TailwindCSS + shadcn/ui

---

## Table des matières
1. [Principes de design](#1-principes-de-design)
2. [Navigation & Layout](#2-navigation--layout)
3. [Page Login](#3-page-login)
4. [Page Dashboard](#4-page-dashboard)
5. [Page Devices](#5-page-devices)
6. [Page Device Detail](#6-page-device-detail)
7. [Page Session Live](#7-page-session-live)
8. [Page Contacts](#8-page-contacts)
9. [Page Audit](#9-page-audit)
10. [Page Enrollment](#10-page-enrollment)

---

## 1. Principes de design

### 1.1 Guidelines

| Principe | Description |
|----------|-------------|
| **Clarté** | Actions critiques bien visibles (gros boutons, couleurs distinctes) |
| **Transparence** | Status devices/sessions always visible (badges, indicateurs) |
| **Rapidité** | Minimal clicks to action (1-click connect, quick search) |
| **Responsive** | Mobile-friendly (tablets pour techniciens terrain) |
| **Accessibilité** | WCAG 2.1 AA (contraste, keyboard navigation) |
| **Dark mode** | Support light/dark theme (preference utilisateur) |

### 1.2 Palette couleurs

| Couleur | Usage | Hex |
|---------|-------|-----|
| **Primary** | Actions principales (connect, create) | `#3B82F6` (blue-500) |
| **Success** | Status online, consentement accepté | `#10B981` (green-500) |
| **Warning** | Alerts, pending actions | `#F59E0B` (amber-500) |
| **Danger** | Revoke, terminate, erreurs | `#EF4444` (red-500) |
| **Gray** | Texte secondaire, borders | `#6B7280` (gray-500) |
| **Background** | Light: `#FFFFFF`, Dark: `#1F2937` | |

### 1.3 Composants UI (shadcn/ui)

- **Button** : primary, secondary, ghost, danger
- **Badge** : online/offline/revoked status
- **Card** : containers pour devices, sessions
- **Table** : liste devices, audit logs
- **Dialog** : modales (create session, confirmation)
- **Toast** : notifications (success, error)
- **Dropdown** : actions rapides (connect, revoke)

---

## 2. Navigation & Layout

### 2.1 Structure layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Header (sticky)                                                 │
│ [Logo MyRemote]        [Search global]     [User Menu ▾]       │
└─────────────────────────────────────────────────────────────────┘
│                                                                   │
│ ┌──────────────┐ ┌─────────────────────────────────────────────┐│
│ │  Sidebar     │ │         Main Content                        ││
│ │              │ │                                             ││
│ │ 📊 Dashboard │ │                                             ││
│ │ 💻 Devices   │ │                                             ││
│ │ 📱 Sessions  │ │                                             ││
│ │ 👥 Contacts  │ │                                             ││
│ │ 📜 Audit     │ │                                             ││
│ │ ⚙️  Settings │ │                                             ││
│ │              │ │                                             ││
│ │ (Collapsible)│ │                                             ││
│ └──────────────┘ └─────────────────────────────────────────────┘│
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 2.2 Header

```
┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│  🏠 MyRemote                🔍 Search devices, contacts...        │
│                                                                   │
│                            [🔔 Notifications (2)]  [Julie ▾]     │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

**User Menu dropdown** :
```
┌──────────────────────┐
│ Julie (Operator)     │
├──────────────────────┤
│ 👤 My Profile        │
│ ⚙️  Settings         │
│ 🌙 Dark Mode [ON]    │
├──────────────────────┤
│ 🚪 Logout            │
└──────────────────────┘
```

**Notifications dropdown** :
```
┌──────────────────────────────────────────────┐
│ Notifications (2 unread)                     │
├──────────────────────────────────────────────┤
│ 🟢 Device PC-Bureau-001 is now online        │
│    2 minutes ago                             │
├──────────────────────────────────────────────┤
│ ⚠️  Session timeout on SRV-PROD-01          │
│    15 minutes ago                            │
├──────────────────────────────────────────────┤
│ [Mark all as read]      [View all]          │
└──────────────────────────────────────────────┘
```

---

## 3. Page Login

```
┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│                         🏠 MyRemote                               │
│                  Remote Support Platform                          │
│                                                                   │
│          ┌─────────────────────────────────────┐                 │
│          │                                     │                 │
│          │   Welcome back                      │                 │
│          │                                     │                 │
│          │   [Continue with Keycloak SSO]     │                 │
│          │                                     │                 │
│          │   By logging in, you agree to our  │                 │
│          │   Terms of Service                  │                 │
│          │                                     │                 │
│          └─────────────────────────────────────┘                 │
│                                                                   │
│                   Need help? Contact support                      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

**Flow** :
1. User clique "Continue with Keycloak SSO"
2. Redirect vers Keycloak login
3. Login + 2FA TOTP
4. Redirect vers Dashboard

---

## 4. Page Dashboard

```
┌───────────────────────────────────────────────────────────────────┐
│ Dashboard                                                         │
└───────────────────────────────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 💻 Devices   │ │ 🟢 Online    │ │ ⚡ Active     │ │ 📊 Sessions  │
│              │ │              │ │   Sessions   │ │   Today      │
│   127        │ │    104       │ │              │ │              │
│              │ │              │ │      3       │ │    42        │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Recent Devices                                   [View all →]     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 🟢 PC-Bureau-001     Windows 11    Last seen: 2 min ago   [Connect] │
│ 🟢 MacBook-Dev-02    macOS 14      Last seen: 5 min ago   [Connect] │
│ 🔴 SRV-PROD-01       Ubuntu 22.04  Last seen: 1 hour ago  [Offline] │
│ 🟢 PC-Compta-12      Windows 10    Last seen: 1 min ago   [Connect] │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Active Sessions                                  [View all →]     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 🖥️  Desktop  │ PC-Bureau-001 │ Julie → Sophie │ 8m 34s  │ [View] │
│ 💻 Terminal │ SRV-PROD-03   │ Marc  → N/A    │ 23m 12s │ [View] │
│ 📁 Files    │ MacBook-Dev   │ Julie → Thomas │ 2m 05s  │ [View] │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Activity Chart (Last 7 days)                                     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Sessions                                                        │
│   50 │                                      ▄█                    │
│   40 │                          ▄█         ███   ▄█              │
│   30 │              ▄█         ███   ▄█   ████  ███              │
│   20 │      ▄█     ███   ▄█   ████ ████  █████ ████   ▄█        │
│   10 │▄█   ███▄█  ████▄█████ ██████████ ██████████▄█ ███        │
│    0 └────────────────────────────────────────────────────       │
│       Mon  Tue  Wed  Thu  Fri  Sat  Sun                          │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

**Interactions** :
- Clic sur stat card → filtre devices list
- Clic "Connect" → ouvre modal create session
- Clic "View" session → ouvre page session live

---

## 5. Page Devices

```
┌───────────────────────────────────────────────────────────────────┐
│ Devices                                             [+ Enroll]    │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Filters & Search                                                  │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 🔍 Search devices...                [Status ▾] [OS ▾] [Group ▾]  │
│                                                                   │
│ [🟢 Online: 104]  [🔴 Offline: 21]  [⛔ Revoked: 2]              │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Devices List                                   Showing 1-50 of 127│
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ☑ │ Status │ Hostname       │ OS        │ Last Seen  │ Actions  │
├───┼────────┼────────────────┼───────────┼────────────┼──────────┤
│ ☐ │ 🟢     │ PC-Bureau-001  │ Win 11    │ 2 min ago  │ [⋮]      │
│ ☐ │ 🟢     │ MacBook-Dev-02 │ macOS 14  │ 5 min ago  │ [⋮]      │
│ ☐ │ 🔴     │ SRV-PROD-01    │ Ubuntu    │ 1 hour ago │ [⋮]      │
│ ☐ │ 🟢     │ PC-Compta-12   │ Win 10    │ 1 min ago  │ [⋮]      │
│   │  ...   │                │           │            │          │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

[< Prev]  [1] [2] [3] ... [10]  [Next >]
```

**Actions dropdown [⋮]** :
```
┌─────────────────────┐
│ 🖥️  Connect Desktop │
│ 💻 Open Terminal    │
│ 📁 Browse Files     │
├─────────────────────┤
│ 📝 Edit Details     │
│ 👁️  View Audit      │
│ ⚙️  Configure       │
├─────────────────────┤
│ ⛔ Revoke Device    │
└─────────────────────┘
```

**Bulk actions** (si devices sélectionnés) :
```
┌────────────────────────────────────────────┐
│ 3 devices selected                         │
│ [Add to Group]  [Revoke]  [Export]        │
└────────────────────────────────────────────┘
```

**Modal "Enroll Device"** :
```
┌───────────────────────────────────────────────────────────────────┐
│ Enroll New Device                                         [X]     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Description (optional)                                            │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ PC Bureau Sophie - Comptabilité                             │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ Device Group (optional)                                           │
│ [Select group ▾]  Production                                      │
│                                                                   │
│ Token Settings                                                    │
│ Max uses: [1 ▾]   Expires in: [24 hours ▾]                       │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ Generated Token:                                            │  │
│ │ myr_8f3k2l9dj3k2l9dj3k2l9dj3k2l9dj         [Copy]          │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ Next Steps:                                                       │
│ 1. Download agent installer for target OS                        │
│    [Windows] [macOS] [Linux]                                      │
│ 2. Run installer with this token                                  │
│ 3. Device will appear in list within 1 minute                     │
│                                                                   │
│                              [Generate Token]  [Cancel]          │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 6. Page Device Detail

```
┌───────────────────────────────────────────────────────────────────┐
│ < Back to Devices                                                 │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ 🟢 PC-Bureau-001                         [Connect ▾] [⚙️ Settings]│
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Status: Online  │  Last seen: 2 minutes ago                       │
│ Enrolled: 2026-01-15 08:00 UTC  │  Agent version: 1.0.0          │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────┐ ┌──────────────────────────┐
│ System Information                 │ │ Network                  │
├────────────────────────────────────┤ ├──────────────────────────┤
│ OS: Windows 11 Pro 22H2            │ │ Local IP: 192.168.1.50   │
│ Architecture: x64                  │ │ Public IP: 1.2.3.4       │
│ Hostname: PC-Bureau-001            │ │ MAC: AA:BB:CC:DD:EE:FF   │
│                                    │ │                          │
│ CPU: Intel i7-1165G7 (4C/8T)       │ │ Uptime: 2d 5h 32m        │
│ RAM: 16 GB (8.2 GB free)           │ │                          │
│ Disk C: 512 GB (128 GB free)       │ │                          │
└────────────────────────────────────┘ └──────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Groups                                              [+ Add Group] │
├───────────────────────────────────────────────────────────────────┤
│ [Production]  [Bureautique]                                       │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Associated Contacts                                 [+ Add]       │
├───────────────────────────────────────────────────────────────────┤
│ 👤 Sophie Martin (sophie.martin@example.com) [Primary]           │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Session History                                    [View all →]   │
├───────────────────────────────────────────────────────────────────┤
│ Date       │ Type    │ User  │ Duration │ Mode      │ Status     │
├────────────┼─────────┼───────┼──────────┼───────────┼────────────┤
│ 2026-01-22 │ Desktop │ Julie │ 8m 34s   │ Attended  │ ✓ Complete │
│ 2026-01-21 │ Terminal│ Marc  │ 15m 20s  │ Unattended│ ✓ Complete │
│ 2026-01-20 │ Files   │ Julie │ 2m 05s   │ Attended  │ ✓ Complete │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Unattended Access                                                 │
├───────────────────────────────────────────────────────────────────┤
│ Status: ❌ Not configured                                         │
│                                                                   │
│ [Configure Unattended Password]                                   │
│                                                                   │
│ ⚠️  Unattended access allows connections without user consent.   │
│    Use only for servers or kiosks. All sessions are audited.     │
└───────────────────────────────────────────────────────────────────┘
```

**Modal "Connect" dropdown** :
```
┌────────────────────────┐
│ 🖥️  Desktop (Attended) │
│ 🖥️  Desktop (Unattended)│
├────────────────────────┤
│ 💻 Terminal            │
│ 📁 Files               │
└────────────────────────┘
```

---

## 7. Page Session Live

### 7.1 Session Desktop (Attended)

```
┌───────────────────────────────────────────────────────────────────┐
│ Session: Desktop - PC-Bureau-001                          [X End] │
├───────────────────────────────────────────────────────────────────┤
│ Status: 🟢 Active  │  Duration: 08:34  │  Latency: 42ms          │
│ User consent: ✓ Granted by Sophie at 10:30                       │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│                                                                   │
│                    [REMOTE DESKTOP CANVAS]                        │
│                  (WebRTC video stream here)                       │
│                                                                   │
│                                                                   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Controls:                                                         │
│ [🖱️ Mouse] [⌨️ Keyboard] [📋 Clipboard] [📸 Screenshot] [⚙️ Quality]│
│                                                                   │
│ Quality: [Auto ▾] (VP9, 1080p, 5.2 Mbps)                         │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Activity Log                                                      │
├───────────────────────────────────────────────────────────────────┤
│ 10:30:00  Session created (attended mode)                         │
│ 10:30:15  User consent granted                                    │
│ 10:30:20  WebRTC connection established (relay)                   │
│ 10:32:45  Clipboard synced (text, 42 bytes)                       │
│ 10:35:10  Screenshot taken                                        │
└───────────────────────────────────────────────────────────────────┘
```

### 7.2 Session Terminal

```
┌───────────────────────────────────────────────────────────────────┐
│ Session: Terminal - SRV-PROD-01                           [X End] │
├───────────────────────────────────────────────────────────────────┤
│ Status: 🟢 Active  │  Duration: 23:12  │  Mode: Unattended       │
│ Justification: "Mise à jour patches sécurité CVE-2026-1234"      │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ myremote@srv-prod-01:~$ ls -la                                    │
│ total 48                                                          │
│ drwxr-xr-x 5 myremote myremote 4096 Jan 22 10:30 .                │
│ drwxr-xr-x 3 root     root     4096 Jan 15 08:00 ..               │
│ -rw-r--r-- 1 myremote myremote  220 Jan 15 08:00 .bash_logout     │
│ -rw-r--r-- 1 myremote myremote 3526 Jan 15 08:00 .bashrc          │
│                                                                   │
│ myremote@srv-prod-01:~$ sudo apt update                           │
│ [sudo] password for myremote: ****                                │
│ Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease            │
│ Get:2 http://security.ubuntu.com/ubuntu jammy-security InRelease  │
│ ...                                                               │
│                                                                   │
│ myremote@srv-prod-01:~$ █                                         │
│                                                                   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

[📋 Copy Output]  [📤 Upload File]  [⚙️ Shell Settings]
```

### 7.3 Session Files

```
┌───────────────────────────────────────────────────────────────────┐
│ Session: Files - PC-Bureau-001                            [X End] │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Remote File Browser                                               │
├───────────────────────────────────────────────────────────────────┤
│ Path: C:\Users\Sophie\Documents                          [↑ Up]   │
│                                                                   │
│ ☐ │ Name              │ Size      │ Modified            │ Actions│
│───┼───────────────────┼───────────┼─────────────────────┼────────│
│ ☐ │ 📁 Archives       │ -         │ 2026-01-20 15:30    │ [⋮]    │
│ ☐ │ 📁 Projets        │ -         │ 2026-01-22 09:00    │ [⋮]    │
│ ☐ │ 📄 Rapport_Q4.pdf │ 2.4 MB    │ 2026-01-21 14:20    │ [⋮]    │
│ ☐ │ 📄 Facture_123.xlsx│ 128 KB   │ 2026-01-22 10:15    │ [⋮]    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

[📥 Download Selected]  [📤 Upload Files]  [🗑️ Delete]

┌───────────────────────────────────────────────────────────────────┐
│ Transfer Queue                                                    │
├───────────────────────────────────────────────────────────────────┤
│ ⬇️ Rapport_Q4.pdf     [████████--]  80%  (1.9 MB / 2.4 MB)      │
└───────────────────────────────────────────────────────────────────┘
```

---

## 8. Page Contacts

```
┌───────────────────────────────────────────────────────────────────┐
│ Contacts                                           [+ Add Contact]│
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ 🔍 Search contacts...                                             │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Contacts List                                    Showing 1-20 of 45│
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 👤 Sophie Martin                                                  │
│    sophie.martin@example.com  │  +33 6 12 34 56 78                │
│    Devices: PC-Bureau-001 🟢                         [View] [Edit]│
│    Notes: Comptabilité, bureau 204                                │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│ 👤 Thomas Dubois                                                  │
│    thomas.dubois@example.com  │  +33 6 98 76 54 32                │
│    Devices: MacBook-Dev-02 🟢, PC-Thomas 🔴          [View] [Edit]│
│    Notes: Développeur senior                                      │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│ 👤 Marie Leroy                                                    │
│    marie.leroy@example.com                                        │
│    Devices: PC-RH-05 🟢                              [View] [Edit]│
│    Notes: RH, recrute stagiaires                                  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

**Modal "Add Contact"** :
```
┌───────────────────────────────────────────────────────────────────┐
│ Add Contact                                               [X]     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Full Name *                                                       │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ Sophie Martin                                               │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ Email                                                             │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ sophie.martin@example.com                                   │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ Phone                                                             │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ +33 6 12 34 56 78                                           │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ Associated Devices                                                │
│ [Select devices ▾]  PC-Bureau-001                                 │
│                                                                   │
│ Notes                                                             │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ Comptabilité, bureau 204                                    │  │
│ │                                                             │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│                                        [Create]  [Cancel]        │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 9. Page Audit

```
┌───────────────────────────────────────────────────────────────────┐
│ Audit Logs                                           [Export]     │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Filters                                                           │
├───────────────────────────────────────────────────────────────────┤
│ Date Range: [Last 7 days ▾]   From: [2026-01-15]  To: [2026-01-22]│
│                                                                   │
│ Action: [All ▾]   User: [All ▾]   Device: [All ▾]   Status: [All ▾]│
│                                                                   │
│ [Apply Filters]  [Reset]                                          │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Logs                                            Showing 1-50 of 324│
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Timestamp        │ User  │ Action         │ Resource    │ Status  │
├──────────────────┼───────┼────────────────┼─────────────┼─────────│
│ 2026-01-22 10:30 │ Julie │ session.created│ PC-Bureau-001│ ✓      │
│   Details: Desktop session (attended), consent granted            │
│   IP: 1.2.3.4  │  Duration: 8m 34s                                │
│                                                                   │
├──────────────────┼───────┼────────────────┼─────────────┼─────────│
│ 2026-01-22 10:15 │ Marc  │ device.enrolled│ SRV-PROD-03 │ ✓      │
│   Details: Token: myr_xxx, Group: Production                      │
│   IP: 5.6.7.8                                                     │
│                                                                   │
├──────────────────┼───────┼────────────────┼─────────────┼─────────│
│ 2026-01-22 09:45 │ Julie │ login.success  │ -           │ ✓      │
│   Details: 2FA verified                                           │
│   IP: 1.2.3.4  │  User-Agent: Chrome 120.0                        │
│                                                                   │
├──────────────────┼───────┼────────────────┼─────────────┼─────────│
│ 2026-01-22 09:30 │ admin │ login.failed   │ -           │ ✗      │
│   Details: Invalid password (attempt 2/5)                         │
│   IP: 9.8.7.6  │  User-Agent: Firefox 121.0                       │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

[< Prev]  [1] [2] [3] ... [7]  [Next >]
```

**Modal "Export Logs"** :
```
┌───────────────────────────────────────────────────────────────────┐
│ Export Audit Logs                                         [X]     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Format                                                            │
│ ○ JSON    ○ CSV    ○ PDF                                          │
│                                                                   │
│ Date Range                                                        │
│ From: [2026-01-01]  To: [2026-01-22]                              │
│                                                                   │
│ Filters (current filters applied)                                 │
│ ☑ Include only filtered results                                   │
│                                                                   │
│ Estimated size: 2.4 MB (324 entries)                              │
│                                                                   │
│ ⚠️  Exported logs will be available for 24 hours                  │
│                                                                   │
│                                        [Export]  [Cancel]         │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 10. Page Enrollment

```
┌───────────────────────────────────────────────────────────────────┐
│ Enrollment                                     [Generate Token]   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Active Tokens                                    Showing 1-5 of 12│
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Token                   │ Created    │ Expires     │ Uses │ Actions│
├─────────────────────────┼────────────┼─────────────┼──────┼────────│
│ myr_8f3k2l9d...3k2l9dj  │ 2026-01-22 │ In 23h 15m  │ 0/1  │ [Revoke]│
│   Description: PC Bureau Sophie                                   │
│   Group: Production                                               │
│                                                                   │
├─────────────────────────┼────────────┼─────────────┼──────┼────────│
│ myr_9g4l3m0e...4l0m8ek  │ 2026-01-21 │ Expired     │ 1/1  │ [Delete]│
│   Description: MacBook Dev Thomas                                 │
│   ✓ Used by: MacBook-Dev-02                                       │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Download Agent Installers                                         │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 🪟 Windows                                                        │
│    myremote-agent-windows-x64.msi (12 MB)        [Download]       │
│    Version: 1.0.0  │  Signature: Verified ✓                       │
│                                                                   │
│ 🍎 macOS                                                          │
│    myremote-agent-macos-universal.pkg (15 MB)    [Download]       │
│    Version: 1.0.0  │  Notarization: Verified ✓                    │
│                                                                   │
│ 🐧 Linux                                                          │
│    myremote-agent_1.0.0_amd64.deb (10 MB)        [Download]       │
│    myremote-agent-1.0.0-1.x86_64.rpm (10 MB)     [Download]       │
│    Version: 1.0.0  │  GPG Signature: Verified ✓                   │
│                                                                   │
│ 📋 Installation Instructions                     [View Docs]      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 11. Composants réutilisables

### 11.1 Device Status Badge

```tsx
// Component: DeviceStatusBadge.tsx
<Badge variant={status === 'online' ? 'success' : 'danger'}>
  {status === 'online' ? '🟢 Online' : '🔴 Offline'}
</Badge>
```

### 11.2 Session Duration Timer

```tsx
// Component: SessionTimer.tsx
// Live updating timer: 08:34 → 08:35 → 08:36
<span className="font-mono">
  {formatDuration(sessionStartedAt)}
</span>
```

### 11.3 Quick Action Button

```tsx
// Component: QuickConnectButton.tsx
<Button
  variant="primary"
  onClick={() => createSession(deviceId, 'desktop')}
>
  Connect
</Button>
```

---

## 12. Responsive Design

### 12.1 Breakpoints

| Device | Width | Layout |
|--------|-------|--------|
| **Mobile** | < 640px | Sidebar hidden (burger menu), cards stack |
| **Tablet** | 640px - 1024px | Sidebar collapsible, cards 2 columns |
| **Desktop** | > 1024px | Sidebar visible, cards 3-4 columns |

### 12.2 Mobile Navigation

```
┌────────────────────────────┐
│ [☰] MyRemote     [🔔] [👤]│
└────────────────────────────┘

[Burger menu ☰] ouvre :

┌────────────────────────────┐
│ 📊 Dashboard               │
│ 💻 Devices                 │
│ 📱 Sessions                │
│ 👥 Contacts                │
│ 📜 Audit                   │
│ ⚙️  Settings               │
└────────────────────────────┘
```

---

## Annexes

### A. Design System (shadcn/ui)

Composants utilisés :
- `Button`, `Badge`, `Card`, `Table`, `Dialog`, `Toast`, `Dropdown`, `Input`, `Select`, `Textarea`, `Checkbox`, `Tabs`

### B. Icônes (Lucide React)

- `Monitor` (desktop), `Terminal`, `Folder` (files), `Users` (contacts), `FileText` (audit), `Settings`, `Bell` (notifications), `User`, `LogOut`

### C. Animations

- Fade in/out (modales)
- Slide in (sidebar mobile)
- Pulse (status badge online)
- Skeleton loaders (pendant fetch data)

---

**Document maintenu par** : Tech Lead Frontend + UI/UX Designer
**Dernière révision** : 2026-01-22
**Figma mockups** : (à créer basé sur ces maquettes textuelles)
