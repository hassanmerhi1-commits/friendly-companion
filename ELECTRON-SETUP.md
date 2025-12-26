# PayrollAO - Desktop App Setup

This guide explains how to run PayrollAO as a standalone desktop application that stores data locally in a file (not in browser storage).

## Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)

## Quick Start (Development Mode)

1. **Install dependencies:**
   ```bash
   npm install
   npm install --save-dev electron electron-builder
   ```

2. **Run in development mode:**
   
   Open two terminals:
   
   Terminal 1 - Start the web server:
   ```bash
   npm run dev
   ```
   
   Terminal 2 - Start Electron:
   ```bash
   npx electron electron/main.cjs
   ```

## Build Standalone Installer

To create an installable desktop app:

1. **Build the web app:**
   ```bash
   npm run build
   ```

2. **Build the Electron app:**
   ```bash
   npx electron-builder --config electron-builder.json
   ```

3. **Find your installer in the `release` folder:**
   - Windows: `PayrollAO Setup.exe` (installer) or `PayrollAO.exe` (portable)
   - Linux: `PayrollAO.AppImage` or `.deb`
   - Mac: `PayrollAO.dmg`

## Data Storage

When running as a desktop app:
- Data is stored in: `%APPDATA%/PayrollAO/payroll-data.json` (Windows)
- Or: `~/.config/PayrollAO/payroll-data.json` (Linux)
- Or: `~/Library/Application Support/PayrollAO/payroll-data.json` (Mac)

This data file:
- Is NOT dependent on any browser
- Can be copied to backup your data
- Can be copied to another computer to transfer data

## Creating a Shortcut

After building, you can:
1. Run the installer (creates Start Menu and Desktop shortcuts)
2. Or use the portable `.exe` directly
3. Or create a shortcut to the portable `.exe`

## Troubleshooting

**App shows blank screen:**
- Make sure you ran `npm run build` before `electron-builder`
- Check that `dist/` folder exists with built files

**Data not saving:**
- Check if the app has write permissions to AppData folder
- Look at the console (F12) for error messages

**Import/Export still works:**
- The Settings page still has Export/Import buttons
- You can use these to backup or transfer data between computers
