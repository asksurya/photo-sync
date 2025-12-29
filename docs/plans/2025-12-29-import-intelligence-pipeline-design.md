# Import Intelligence Pipeline Design

**Date:** 2025-12-29
**Status:** Approved
**Category:** Automation & Workflow

## Overview

The Import Intelligence Pipeline automates photo triage and organization after bulk imports to Immich. It reduces manual work by analyzing photos in the background and presenting a smart "Triage Dashboard" with AI-powered suggestions for handling duplicates, burst sequences, low-quality photos, and organization.

## Problem Statement

**Current Pain Points:**
- Bulk importing photos requires extensive manual review
- Finding and removing duplicates is time-consuming
- Identifying which photos from burst sequences to keep requires reviewing each shot
- Low-quality or corrupted photos clutter the library
- Large archive imports (10K+ photos) are overwhelming to organize

**User Profile:**
- Imports photos in bulk (from camera, SD cards, archives)
- Has large photo archives to import into fresh Immich installation
- Wants manual control but with smart assistance (not fully autonomous AI)
- Values time savings and storage optimization

## Solution: Import Intelligence Pipeline

After bulk import to Immich, the system automatically analyzes photos and presents a categorized triage dashboard. Users review organized groups of issues (duplicates, bursts, quality problems) with AI recommendations and bulk actions, rather than reviewing thousands of individual photos.

## User Experience Flow

### 1. Import Photos
User imports photos to Immich (unchanged from current workflow)

### 2. Background Analysis
System automatically kicks off analysis pipeline:
- Exact duplicate detection (hash-based)
- Perceptual duplicate detection (existing dedup service)
- Quality scoring (blur, exposure, corruption detection)
- Burst sequence detection (metadata-based)
- Smart organization suggestions (leverages Immich metadata)

### 3. Triage Dashboard Ready
User receives notification that analysis is complete and dashboard is ready for review

### 4. Review Categories
User reviews each category at their own pace:
- **Exact Duplicates:** Smart defaults select best version, bulk approve or manually adjust
- **Burst Sequences:** AI highlights sharpest shot, one-click to keep best
- **Low Quality Photos:** Review photos below quality threshold, bulk delete
- **Perceptual Duplicates:** Manual review of similar photos with suggestions
- **Organization Suggestions:** AI suggests albums by date/location

### 5. Apply Actions
User approves actions (delete, keep, organize) with bulk operations or individual adjustments

### 6. Clean Library
Photos are organized, duplicates removed, only quality shots remain

## Triage Dashboard UI

### Dashboard Layout

**Main View:**
Card-based interface with issue categories, each showing:
- Issue type (e.g., "Exact Duplicates")
- Count (e.g., "47 items need review")
- Estimated impact (e.g., "Save 2.3 GB")
- Action button ("Review Now" or "Auto-fix")

**Priority Ordering:**
1. **Exact Duplicates** (highest confidence, auto-fix available)
2. **Low Quality Photos** (blurry, very dark, corrupted)
3. **Burst Sequences** (similar shots in rapid succession)
4. **Perceptual Duplicates** (similar but not identical)
5. **Unorganized Photos** (suggest albums/tags)

**Smart Indicators:**
- 🟢 Green badge: "Auto-fix safe" (exact duplicates, corrupted files)
- 🟡 Yellow badge: "Quick review" (burst sequences with clear best shot)
- 🟠 Orange badge: "Manual review recommended" (perceptual duplicates)

**Batch Actions:**
- "Auto-fix all green badges" (one-click for safe operations)
- "Review all" (step through categories sequentially)
- "Skip for now" (process later, photos remain untouched)

**Visual Style:**
Follows Immich dark theme with card-based layout similar to existing duplicates view

### Category Review Interfaces

**Exact Duplicates Review:**
- Grid view showing duplicate groups (2-4 photos per group)
- Smart recommendation highlighted (highest resolution, newest timestamp)
- Bulk actions: "Accept all recommendations" or "Review individually"
- Individual controls: radio buttons to pick version, "Keep all" option
- Metadata diff: resolution, file size, date modified

**Burst Sequence Review:**
- Timeline strip showing 3-8 photos from each burst
- AI highlights sharpest, best-exposed shot with green border
- Quick actions: "Keep highlighted", "Keep all", manual checkboxes
- Metadata: shutter speed, focus confirmation, exposure value

**Low Quality Photos Review:**
- Grid with quality scores (0-100)
- Filters: "Very blurry" (<30), "Dark/overexposed" (<40), "Corrupted" (0)
- Preview on hover to verify before deleting
- Bulk select by threshold: "Delete all <20"
- Safety: Moved to trash, not permanently deleted (can undo)

**Perceptual Duplicates Review:**
- Side-by-side comparison of similar photos
- Similarity percentage displayed
- Option to mark as "not duplicate" to exclude from future analysis
- Keep one, keep all, or delete all options

**Organization Suggestions:**
- Auto-generated album suggestions based on:
  - Date ranges (e.g., "December 2025 Trip")
  - GPS location clusters (e.g., "Photos from Paris")
  - Immich face recognition groups
- One-click to create album with selected photos
- Manual album name editing before creation

## Backend Architecture

### New Service: Analysis Service

**Technology:**
- Python 3.11+ with FastAPI framework
- OpenCV for blur detection
- PIL/Pillow for image processing
- PostgreSQL for data storage (shared with other services)
- Docker containerized

**API Endpoints:**

```
POST /analyze/import/{import_id}
- Trigger analysis for import batch
- Request body: { immich_user_id, asset_ids[] }
- Response: { batch_id, status: 'processing' }

GET /triage/{import_id}
- Get triage dashboard data
- Response: { categories: [], total_assets, analyzed_assets }

POST /triage/{import_id}/apply
- Execute approved actions
- Request body: { actions: [{ asset_id, action_type }] }
- Response: { applied_count, failed_count }

GET /analysis/status/{import_id}
- Check processing progress
- Response: { status, progress_percent, eta_seconds }
```

### Analysis Pipeline

**Processing Jobs Queue:**

1. **Exact Duplicate Detection** (~1000 photos/second)
   - MD5 hash comparison of file content
   - Groups identical files regardless of filename
   - Highest confidence, safe for auto-fix

2. **Perceptual Duplicate Detection** (~100 photos/second)
   - Queries existing deduplication service
   - Perceptual hashing (pHash) for similarity scoring
   - Threshold: 90%+ similarity flagged as likely duplicate

3. **Quality Scoring** (~200 photos/second)
   - Blur detection using Laplacian variance
   - Exposure analysis via histogram distribution
   - File corruption detection (integrity checks)
   - Overall quality score: weighted combination

4. **Burst Detection** (metadata-only, very fast)
   - Groups photos within 2-second intervals
   - Same camera, continuous sequence numbers
   - Scores each photo by sharpness for recommendation

5. **Organization Suggestions** (leverages Immich)
   - Groups by date ranges for album suggestions
   - Uses GPS data for location-based albums
   - Defers to Immich's existing face recognition

**Processing Priority:**
- Small imports (<100 photos): Process immediately in foreground
- Large imports (1000+ photos): Process in batches with progress updates
- Estimated time: ~10,000 photos in 5-10 minutes on typical hardware

**Resource Requirements:**
- Docker container: ~512MB RAM for analysis workers
- CPU: Scales with photo count (mostly I/O bound for reading thumbnails)
- Storage: Minimal (stores scores/flags, not images)

### Integration Points

**With Immich:**
- Listens to Immich webhook for new uploads (or polls API every 30s)
- Reads photo metadata and thumbnails via Immich API
- Uses Immich's existing asset IDs (no data duplication)
- Deletes/organizes photos through Immich API

**With Deduplication Service:**
- Queries for perceptual duplicate groups
- Reuses existing pHash computations

**With Grouping Service:**
- Checks if photos are part of RAW+JPEG groups
- Avoids flagging intentional pairs as duplicates

**With API Gateway:**
- New `/triage` endpoint aggregates analysis results
- Combines data from analysis service, dedup, and grouping

**Data Flow:**
```
Immich Upload → Webhook/Poll → Analysis Service
                                      ↓
                     [Quality Score | Burst Detect | Query Dedup Service]
                                      ↓
                              Store in PostgreSQL
                                      ↓
                     Web UI requests via API Gateway
                                      ↓
                              Triage Dashboard
```

## Database Schema

### New Tables

**`import_batches` table:**
```sql
CREATE TABLE import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    immich_user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) NOT NULL CHECK (status IN ('processing', 'complete', 'failed')),
    total_assets INTEGER NOT NULL,
    analyzed_assets INTEGER DEFAULT 0,
    skipped_assets INTEGER DEFAULT 0,
    error_message TEXT,
    INDEX idx_user (immich_user_id),
    INDEX idx_status (status)
);
```

**`asset_quality_scores` table:**
```sql
CREATE TABLE asset_quality_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    immich_asset_id VARCHAR(255) NOT NULL,
    import_batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE,
    blur_score FLOAT CHECK (blur_score >= 0 AND blur_score <= 100),
    exposure_score FLOAT CHECK (exposure_score >= 0 AND exposure_score <= 100),
    overall_quality FLOAT CHECK (overall_quality >= 0 AND overall_quality <= 100),
    is_corrupted BOOLEAN DEFAULT FALSE,
    analyzed_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_asset (immich_asset_id),
    INDEX idx_batch (import_batch_id),
    INDEX idx_quality (overall_quality)
);
```

**`burst_sequences` table:**
```sql
CREATE TABLE burst_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE,
    immich_asset_ids VARCHAR(255)[] NOT NULL,
    recommended_asset_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_batch (import_batch_id),
    INDEX idx_recommended (recommended_asset_id)
);
```

**`triage_actions` table:**
```sql
CREATE TABLE triage_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('delete', 'keep', 'organize')),
    immich_asset_id VARCHAR(255) NOT NULL,
    applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMP,
    user_overridden BOOLEAN DEFAULT FALSE,
    INDEX idx_batch (import_batch_id),
    INDEX idx_asset (immich_asset_id),
    INDEX idx_applied (applied)
);
```

**Reuses Existing Tables:**
- Duplicate detection data from `deduplication` service
- RAW+JPEG grouping data from `grouping` service

## Error Handling & Edge Cases

### Partial Processing Failures

**Scenario:** Quality scoring fails for some photos (corrupted metadata, unsupported format)

**Solution:**
- Skip problematic photos with logged error
- Dashboard shows: "143 of 150 photos analyzed (7 skipped - view details)"
- Skipped photos still appear in Immich normally, excluded from triage

### Processing Interruptions

**Scenario:** Analysis job crashes mid-processing

**Solution:**
- Jobs are idempotent - safe to rerun
- Resume from last checkpoint using `analyzed_assets` count
- User can manually trigger "Re-analyze import" if needed

### Timing Edge Cases

**Photos deleted before triage review:**
- Dashboard updates in real-time, removes deleted photos from groups
- If one duplicate pair member deleted manually, remove from duplicates category

**Immich imports finish before analysis:**
- Photos appear in Immich immediately (unchanged behavior)
- Triage dashboard populates as analysis completes
- Users can browse Immich normally while analysis runs

**Analysis finds no issues:**
- Dashboard shows: "✅ No issues found - your import looks great!"
- Still shows "Organize" suggestions for album creation

### User Disagreement with AI

**Scenario:** User disagrees with quality scores or recommendations

**Solution:**
- Mark `user_overridden = true` in database
- Allow marking photos as "not duplicate" to exclude from future analysis
- Future enhancement: Learn user preferences (e.g., "Don't flag photos >2MB as low quality")

### Safety Mechanisms

**No automatic deletion:**
- All actions require manual approval
- Even "Auto-fix" shows preview before executing

**Trash instead of permanent delete:**
- Deleted photos moved to Immich trash
- Can be restored within retention period

**Undo capability:**
- Track all applied actions in `triage_actions` table
- "Undo triage" restores photos from trash

## Testing Strategy

### Unit Tests (Target: 100% coverage)

**Quality Scoring Tests:**
- Test blur detection with known sharp/blurry images
- Test exposure analysis with under/over-exposed samples
- Test corruption detection with intentionally damaged files
- Mock OpenCV/PIL for fast test execution
- Edge case: very small images, extreme aspect ratios

**Burst Detection Tests:**
- Test sequence grouping with mock EXIF timestamps
- Test edge cases: timezone changes, non-sequential bursts
- Test single photos (should not create burst groups)
- Test interleaved bursts (two sequences mixed together)

**Import Batch Processing Tests:**
- Test partial failures (some photos unanalyzable)
- Test resume from checkpoint after interruption
- Test empty imports (0 photos)
- Test concurrent batch processing (multiple users)

### Integration Tests

**Cross-Service Integration:**
- Mock Immich API responses for asset metadata
- Test querying deduplication service for existing duplicates
- Test querying grouping service to exclude RAW+JPEG pairs
- Test API Gateway triage endpoint aggregation
- Test webhook/polling for new Immich uploads

**Database Tests:**
- Test import batch creation and status updates
- Test quality score storage and retrieval with constraints
- Test burst sequence relationships and cascading deletes
- Test triage action tracking and rollback
- Test concurrent batch creation (race conditions)

### End-to-End Tests

**Full Workflow Tests:**
- Import 100 test photos → verify dashboard appears
- Apply triage actions → verify photos deleted from Immich
- Test undo/rollback of triage actions
- Test concurrent imports from multiple users
- Test analysis + triage for 10,000 photo import

**Performance Tests:**
- Benchmark 10,000 photo analysis (target: <10 minutes)
- Test memory usage stays under 512MB
- Test database query performance with 100K+ assets
- Test thumbnail loading performance (should use Immich cache)

**UI Tests:**
- Test dashboard card rendering with various counts
- Test category review pagination (large duplicate groups)
- Test bulk action confirmation flows
- Test real-time progress updates during analysis

### Test Data

**Curated Test Photo Set (50 photos):**
- 5 exact duplicates (same file, different names)
- 10 burst sequence photos (2 bursts of 5 each)
- 5 blurry photos (known blur scores)
- 5 dark/overexposed photos
- 5 perceptual duplicates (similar but different)
- 2 corrupted files (intentionally damaged)
- 18 good quality photos (control group)

**Metadata Variations:**
- Different cameras (Canon, Nikon, iPhone)
- Different formats (JPEG, PNG, HEIC, RAW)
- Different resolutions (phone to DSLR)
- With and without GPS data
- With and without EXIF timestamps

## Implementation Phases

### Phase 1: Core Analysis Engine (Week 1-2)
- Set up Analysis Service with FastAPI
- Implement exact duplicate detection (MD5 hashing)
- Implement quality scoring (blur, exposure, corruption)
- Implement burst detection (metadata-based)
- Database schema and migrations
- Unit tests for all analysis functions

### Phase 2: Integration Layer (Week 3)
- Immich webhook/polling integration
- Query deduplication service for perceptual duplicates
- Query grouping service for RAW+JPEG pairs
- API Gateway triage endpoints
- Integration tests

### Phase 3: Triage Dashboard UI (Week 4-5)
- Dashboard card layout and routing
- Exact duplicates review interface
- Burst sequence review interface
- Low quality photos review interface
- Perceptual duplicates review interface
- Organization suggestions interface

### Phase 4: Actions & Safety (Week 6)
- Implement delete/keep/organize actions via Immich API
- Undo/rollback functionality
- User preference storage
- Real-time dashboard updates

### Phase 5: Testing & Polish (Week 7)
- End-to-end tests with large datasets
- Performance optimization
- Error handling refinement
- Documentation and user guide

## Success Metrics

**User Time Savings:**
- Reduce triage time by 70% for 1000-photo imports
- Target: 10,000 photos reviewed in <30 minutes (vs 3+ hours manual)

**Storage Optimization:**
- Average 15-20% storage savings from duplicate removal
- Identify 5-10% of photos as low quality for potential deletion

**Accuracy:**
- Exact duplicate detection: 100% precision, 100% recall
- Quality scoring: 90%+ agreement with manual review
- Burst best-shot selection: 85%+ agreement with manual selection

**System Performance:**
- Analysis speed: 100+ photos/second average
- Memory usage: <512MB under load
- Dashboard load time: <2 seconds for 10,000 photo batch

**User Satisfaction:**
- 90%+ of users trust AI recommendations
- <5% of actions require user override
- Users complete triage within 24 hours of import

## Future Enhancements

**Machine Learning Improvements:**
- Train custom quality scoring model on user feedback
- Learn user preferences for duplicate resolution
- Auto-tagging based on image content (objects, scenes)

**Advanced Organization:**
- Smart album creation based on events (detect trips, holidays)
- Automatic chronological story generation
- Duplicate detection across albums (find same photo in multiple places)

**Workflow Optimization:**
- Schedule triage for low-usage times (overnight processing)
- Progressive triage (show high-confidence items first)
- Mobile triage interface (review on phone)

**Collaboration Features:**
- Multi-user triage (family reviews together)
- Shared triage decisions (one person's keep = everyone's keep)
- Delegated triage (assign burst review to specific user)

## Dependencies

**New:**
- Python 3.11+
- FastAPI
- OpenCV (cv2)
- PIL/Pillow

**Existing:**
- PostgreSQL (shared with other services)
- Redis (for job queuing)
- Immich API access
- Deduplication service
- Grouping service
- API Gateway

## Risks & Mitigations

**Risk:** Quality scoring ML models too slow for large imports
**Mitigation:** Use OpenCV lightweight algorithms, parallelize analysis, show progressive results

**Risk:** Users don't trust AI recommendations
**Mitigation:** Always require manual approval, show confidence scores, allow feedback

**Risk:** Accidental deletion of important photos
**Mitigation:** Use Immich trash (not permanent delete), implement undo, require confirmation for bulk deletes

**Risk:** Analysis service crashes with large imports
**Mitigation:** Batch processing with checkpoints, idempotent jobs, graceful error handling

## Conclusion

The Import Intelligence Pipeline transforms the tedious post-import triage process into an efficient, guided workflow. By analyzing photos in the background and presenting organized categories with smart recommendations, users save significant time while maintaining full control. The system fits naturally into photo-sync's existing architecture, leverages Immich's capabilities, and follows the project's TDD standards.

**Key Benefits:**
- 70%+ time savings for photo triage
- 15-20% storage optimization from duplicate removal
- Manual control with AI assistance (not fully autonomous)
- Scales to large archive imports (10K+ photos)
- Clean integration with existing photo-sync services
