# Patrol Tracker

A mobile app for solo night patrol services. During each patrol shift, the app records your location continuously and generates clear, client-ready proof of presence and checks.

## Features

### Core Workflow
- **Start/End Shift**: Start tracking with GPS permission, stops and compiles shift report
- **Mode Toggle**: Switch between "Driving" and "On Foot" modes
- **Quick Logs**: 
  - Field Check: Log entry with time, GPS, optional photo and note
  - Irregularity: Log entry with time, GPS, optional photo and mandatory description

### GPS Tracking Modes
- **Continuous**: Records location every few seconds for full route visualization
- **Event-Only**: Only records location when logging events (German labor law compliant)

### Map Visualization
- Full route displayed with time-segmented colors (30-min intervals)
- Different line styles for driving (solid) vs walking (dashed)
- Markers for Field Check (green) and Irregularity (red) events
- Route filtering: All / Driving only / On Foot only

### History
- Browse past shift reports
- View detailed shift information with route map
- Delete old shifts

### Profile
- GPS Tracking Mode toggle (Continuous vs Event-Only)
- Map settings (auto-center, high accuracy GPS)
- Report settings (PDF quality, portal auto-upload)
- Clear all data option

### Subscription Tiers (via Stripe)
- **Personal** (€9.99/mo): Full GPS tracking with continuous route recording
- **Business** (€49/mo): Team management for up to 10 users
- **Enterprise** (€199/mo): Privacy-compliant event-only tracking

## Tech Stack
- **Frontend**: Expo / React Native
- **Backend**: Express.js (TypeScript)
- **Database**: PostgreSQL with Drizzle ORM
- **Payments**: Stripe (subscriptions, products, checkout)
- **Storage**: AsyncStorage (local persistence)
- **Maps**: react-native-maps
- **Location**: expo-location
- **Camera**: expo-image-picker

## Project Structure
```
client/
├── App.tsx                 # Main app with providers
├── components/             # Reusable UI components
├── constants/theme.ts      # Design system tokens
├── contexts/ShiftContext.tsx  # Shift state management
├── hooks/                  # Custom hooks
├── lib/storage.ts          # AsyncStorage utilities
├── navigation/             # Navigation stacks
├── screens/                # App screens
└── types/shift.ts          # TypeScript types
server/
├── index.ts               # Express server with Stripe init
├── routes.ts              # API routes (products, checkout, subscriptions)
├── storage.ts             # Database queries for Stripe data
├── stripeClient.ts        # Stripe client configuration
├── seed-products.ts       # Script to create subscription products
└── templates/             # Landing page
shared/
└── schema.ts              # Drizzle database schema
```

## API Endpoints
- `GET /api/products` - List subscription products with prices
- `POST /api/checkout` - Create Stripe checkout session
- `POST /api/portal` - Create Stripe customer portal session
- `GET /api/subscription/:userId` - Get user subscription info

## Navigation Structure
- **Active Shift Tab**: Main map screen with tracking controls
- **History Tab**: List of past shifts → Shift Detail
- **Profile Tab**: Settings and preferences

## Modals
- **Quick Log**: Log Field Check or Irregularity events
- **Shift Summary**: Review completed shift before saving

## Recent Changes
- Added GPS Tracking Mode toggle (Continuous vs Event-Only) in Profile
- Integrated Stripe for subscription billing
- Created subscription products (Personal, Business, Enterprise)
- Added PostgreSQL database with Drizzle ORM for user/subscription data
- Initial MVP implementation with location tracking, event logging, and shift history
- Map visualization with time-segmented route colors
- Camera integration for photo attachments

## Next Phase Features
- PDF report generation
- Portal upload functionality
- Background location tracking
- Speed-based auto mode detection
- Connect tracking mode to ShiftContext for actual behavior change
