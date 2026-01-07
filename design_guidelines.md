# Patrol Tracking App - Design Guidelines

## Architecture Decisions

### Authentication
**Auth Required** - The app stores sensitive patrol data and requires secure portal integration.

**Implementation:**
- SSO with Apple Sign-In (iOS) and Google Sign-In (Android)
- Email/password as fallback option
- Account screen with:
  - Profile avatar (1 preset: security badge icon)
  - Display name
  - Log out (with confirmation)
  - Delete account (Settings > Account > Delete, double confirmation)

### Navigation
**Root: Tab Navigation (3 tabs)**
- **Active Shift** (default): Real-time tracking interface
- **History**: Past shift reports and analytics
- **Profile**: Account settings and preferences

Stack structure:
- Active Shift stack: Active Shift → Shift Summary (modal)
- History stack: History List → Shift Detail → PDF Preview (modal)
- Profile stack: Profile → Settings → About

## Screen Specifications

### 1. Active Shift Screen
**Purpose:** Primary control center for patrol tracking during shifts.

**Layout:**
- **Header:** Transparent, no title
  - Left: None
  - Right: Settings icon button
- **Main Content:** Non-scrollable, full-screen map
  - Map fills entire screen behind tab bar
  - Overlays positioned absolutely over map
- **Safe Area Insets:**
  - Top: insets.top + Spacing.xl
  - Bottom: tabBarHeight + Spacing.xl

**Components:**
- Full-screen map component (MapView)
- Status card (floating, top center):
  - Shift status (Active/Inactive)
  - Timer display (HH:MM:SS)
  - Current mode badge (Driving/On foot)
- Primary action button (floating, bottom center):
  - "START SHIFT" (when inactive) - large, prominent
  - "END SHIFT" (when active) - warning color
  - Shadow: offset(0,2), opacity 0.10, radius 2
- Quick action panel (floating, bottom):
  - Mode toggle (Driving/On foot) - segmented control
  - Field Check button - success color
  - Irregularity button - error color
  - All buttons with icons from Feather set
- Map legend (floating, top left):
  - Color-coded time segments indicator
  - Filter buttons (All/Driving/On foot)

### 2. Quick Log Modal (Field Check / Irregularity)
**Purpose:** Capture timestamped patrol events with optional photo and notes.

**Layout:**
- **Header:** Default navigation
  - Left: Cancel button
  - Right: Save button
  - Title: "Field Check" or "Irregularity"
- **Main Content:** Scrollable form
- **Safe Area Insets:**
  - Top: Spacing.xl (header is opaque)
  - Bottom: insets.bottom + Spacing.xl

**Components:**
- Auto-populated timestamp (read-only field)
- GPS coordinates (read-only, with accuracy indicator)
- Photo attachment button:
  - Camera icon
  - Thumbnail preview when image selected
- Text input field:
  - Optional for Field Check
  - Mandatory for Irregularity (with asterisk)
  - Multiline, max 200 characters
- Submit button below form (full width)

### 3. Shift Summary Screen (Modal)
**Purpose:** Preview shift data before finalizing report.

**Layout:**
- **Header:** Default navigation
  - Left: Cancel (returns to active map)
  - Right: None
  - Title: "Shift Summary"
- **Main Content:** Scrollable
- **Safe Area Insets:**
  - Top: Spacing.xl
  - Bottom: insets.bottom + Spacing.xl

**Components:**
- Shift metadata card:
  - Date, start/end time, duration
  - Total distance (driving vs. on foot)
- Map preview (static, 300px height)
- Event list (chronological):
  - Type icon + timestamp + note
  - Photo thumbnail if attached
- Action buttons (fixed at bottom):
  - "Generate PDF" (primary)
  - "Upload to Portal" (secondary)

### 4. History List Screen
**Purpose:** Browse past shift reports.

**Layout:**
- **Header:** Default navigation
  - Left: None
  - Right: Search icon
  - Title: "History"
- **Main Content:** Scrollable list
- **Safe Area Insets:**
  - Top: Spacing.xl
  - Bottom: tabBarHeight + Spacing.xl

**Components:**
- List items (cards):
  - Date (large, bold)
  - Duration + distance summary
  - Event count badges (Field Checks, Irregularities)
  - Thumbnail map preview
  - Chevron right indicator
- Empty state: "No shifts recorded"

### 5. Profile Screen
**Purpose:** User account and app preferences.

**Layout:**
- **Header:** Default navigation
  - Title: "Profile"
- **Main Content:** Scrollable
- **Safe Area Insets:**
  - Top: Spacing.xl
  - Bottom: tabBarHeight + Spacing.xl

**Components:**
- Avatar + name (editable)
- Settings sections:
  - Map preferences (default zoom, auto-center)
  - Report settings (PDF quality, portal auto-upload)
  - Notifications (shift reminders)
  - Account (log out, delete)

## Design System

### Color Palette
- **Primary:** Deep blue (#1E40AF) - authority, trust
- **Success:** Green (#10B981) - Field Checks, safe routes
- **Warning:** Amber (#F59E0B) - mode changes
- **Error:** Red (#EF4444) - Irregularities, end shift
- **Neutral Gray:** #6B7280
- **Background:** White (#FFFFFF)
- **Surface:** Light gray (#F3F4F6)

### Typography
- **Headers:** System bold, 24pt
- **Body:** System regular, 16pt
- **Captions:** System medium, 14pt
- **Timestamps:** System mono, 12pt

### Map Styling
- **Time-segmented routes:**
  - 0-30 min: #10B981 (green)
  - 30-60 min: #F59E0B (amber)
  - 60-90 min: #EF4444 (red)
  - Continue cycling with opacity variations
- **Direction arrows:** Every 50m, subtle gray (#9CA3AF)
- **Markers:**
  - Field Check: Green pin with checkmark
  - Irregularity: Red pin with alert icon
- **Mode differentiation:**
  - Driving: Solid line (4px width)
  - On foot: Dashed line (2px width)

### Critical Assets
1. **Security badge avatar** (profile default) - shield with star icon
2. **Mode icons:**
   - Car icon (Feather: truck)
   - Walking icon (Feather: user)
3. **Event markers:**
   - Checkmark (Feather: check-circle)
   - Alert (Feather: alert-triangle)

### Interaction Design
- All buttons use press feedback (opacity 0.7)
- Floating buttons have shadow: offset(0,2), opacity 0.10, radius 2
- Map animations smooth (duration 300ms)
- Success haptic on log save
- Warning haptic on end shift

### Accessibility
- Minimum touch targets: 44x44pt
- High contrast between route colors
- VoiceOver labels for all map markers
- Dynamic type support for all text