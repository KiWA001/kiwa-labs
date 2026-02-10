---
description: Locked files that should not be edited without explicit user permission
---

# Locked Files Policy

The following files are **LOCKED** and must NOT be edited unless the user explicitly requests changes to them.

## Locked Components

### Water Effect System
These files control the water ripple and wave animations on the homepage:

1. **`/components/WaterEffect.tsx`** - Main water ripple and wave animation component
   - Faint ripples with 5 concentric rings at ~8% opacity
   - 3-5 second random intervals between drops
   - Beach wave effects from random angles
   - Swipe detection to stop effects

   - **Scale Effect**: Incoming text zooms in from Scale 20 (Huge/Behind Camera). Outgoing text shrinks to Scale 0.2.

## Rules

1. **DO NOT** modify these files when working on other features
2. **DO NOT** refactor or "improve" these files without explicit permission
3. If a bug is found in these files, **ASK THE USER** before making any changes
4. If changes are needed to integrate with new features, **ASK THE USER** first

## How to Unlock

The user must explicitly say something like:
- "Edit the water effect"
- "Change the ripple behavior"
- "Modify WaterEffect.tsx"
- "Unlock the water effect files"

Without such explicit permission, treat these files as read-only.
