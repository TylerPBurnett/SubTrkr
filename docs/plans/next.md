# Remaining for Future Iterations

Edge case handling and error states
Empty states with helpful onboarding
Keyboard shortcuts
Performance optimization

# Future Enhancements (v2+)

E2EE Sync: Optional cloud sync with end-to-end encryption
WebAuthn/Passkey: Passwordless authentication for sync
Import/Export: CSV import, data export
Receipt Tracking: Attach payment receipts
Budget Alerts: Notify when spending exceeds threshold
Commands to Initialize

# Create Tauri + React + TypeScript project

bunx create-tauri-app SubTrkr --template react-ts --manager bun

# Add Tauri plugins

cd SubTrkr/src-tauri
cargo add tauri-plugin-sql --features sqlite
cargo add tauri-plugin-notification

# Add frontend dependencies

cd ..
bun add @tauri-apps/plugin-sql @tauri-apps/plugin-notification
bun add -D tailwindcss postcss autoprefixer
bun add lucide-react recharts uuid
bun add -D @types/uuid
