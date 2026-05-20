# Operations Dashboard - Development Plan

## Overview
Combine sync and webhook dashboards into a unified "Operations Dashboard" with:
- Scheduled sync (twice daily, configurable)
- Visual activity timeline showing syncs + webhooks interleaved
- Tabbed interface: Overview | Sync Details | Webhook Details

## Files to Create/Modify

### Backend (3 files)
1. **models/sync_schedule.py** - SQLAlchemy model for sync schedule config
2. **routers/sync_schedule.py** - API endpoints for schedule CRUD + background scheduler
3. **main.py** - Register new router, start scheduler on startup

### Frontend (2 files)
4. **pages/AdminOperationsDashboard.tsx** - Unified operations dashboard with tabs
5. **App.tsx** - Add route for /admin/operations

## Design
- Reuse existing API calls from AdminSyncDashboard and AdminWebhookDashboard
- Schedule stored in DB: two time slots per day (HH:MM format)
- Background asyncio task checks every 60s if it's time to sync
- Timeline shows last 48h of activity (sync logs + webhook events merged by timestamp)
- Tabs use simple state toggle, no extra dependencies

## Implementation Notes
- Keep existing /admin/sync-dashboard and /admin/webhook-dashboard routes working
- The operations dashboard aggregates data from existing endpoints
- Schedule endpoint: GET/PUT /api/v1/sync/schedule
- New endpoint: GET /api/v1/operations/timeline (merges sync logs + webhook events)