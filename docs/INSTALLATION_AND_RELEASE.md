# Cricket360: Windows Installation & Release Guide

## 1. Distribution Model & Requirements

Cricket360 is packaged as a standalone desktop application for Windows 10 and Windows 11 (64-bit architecture).
It runs completely offline and requires no internet access or external database servers.

### System Prerequisites
- **Operating System:** Windows 10 (Build 19041+) or Windows 11 (64-bit).
- **RAM:** 4 GB minimum (8 GB recommended for large catalogs).
- **Disk Space:** 500 MB for application files + local SQLite database storage.
- **Display Resolution:** Optimized for 1366x768, 1920x1080, and higher desktop displays.
- **Hardware Peripherals:** Standard USB HID barcode scanners, standard A4 desktop printers, and 80mm/58mm thermal receipt printers (ESC/POS compatible).

---

## 2. Packaging Configuration

Packaging is powered by **Electron Builder** using the NSIS target.

### Windows Installer (`.exe`)
- Generates an NSIS setup file: `dist/Cricket360-Setup-<version>.exe`.
- Creates desktop shortcut and Start Menu entry.
- Configured with `perMachine: false` (user installation) or `perMachine: true` (system-wide admin installation).
- Automatically preserves the local SQLite database directory across upgrades and uninstallations.

---

## 3. Data Storage & Upgrade Safety

### Persistent Directory Location
The application database, backups, and user settings are stored in the user's roaming AppData directory:
```
C:\Users\<Username>\AppData\Roaming\Cricket360\
├── database/
│   ├── cricket360.sqlite
│   ├── cricket360.sqlite-wal
│   └── cricket360.sqlite-shm
├── backups/
│   └── cricket360_backup_YYYY-MM-DD_HHMMSS.cricket360bak
└── logs/
    └── cricket360-app.log
```

### Safe Upgrade Procedure
1. When a new version is installed, the installer replaces the application binaries in `AppData\Local\Programs\Cricket360` but **never touches** `AppData\Roaming\Cricket360`.
2. On first launch of the upgraded application, the database migration runner automatically detects pending migrations and applies them inside an atomic transaction.
3. If a migration fails, the transaction is rolled back and an alert dialog directs the user to contact technical support or restore from an automated backup copy.
