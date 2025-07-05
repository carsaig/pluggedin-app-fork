# Review System Test Guide

## Issue Fixed
The Reviews interface was unable to add new comments because:
- Comment submission was working (sent to Registry VP API)
- Comment retrieval was broken (calling unimplemented Analytics API)

## Fix Applied
Updated both `ServerReviewsList` and `ReviewsDialog` components to use the Registry VP client for **both** submission and retrieval, instead of the broken Analytics API.

## Test Steps

### 1. Test Comment Submission
1. Go to `/search` page
2. Find any Registry or Community server
3. Click the "Rate" button on a server card  
4. Fill out rating (1-5 stars) and comment
5. Click "Submit Rating"
6. Should see success toast message

### 2. Test Comment Retrieval
1. After submitting a rating/comment, refresh the page
2. Click on the same server's reviews count (if visible)
3. Should see the Reviews dialog with your comment
4. OR click on the server to open detail dialog
5. Go to the "Reviews" tab
6. Should see your comment listed

### 3. Test Comment Display
1. Check that comments show:
   - User avatar/name
   - Star rating
   - Comment text
   - Time ago
2. Check sorting options work (newest, oldest, rating high/low)

## Expected Behavior
- Comments should now be both **saved** and **displayed** properly
- No more empty review sections
- Works for both Registry and Community servers
- Real-time updates after submitting reviews

## Technical Changes Made
1. **ServerReviewsList component**: Removed Analytics API calls, now uses `registryVPClient.getFeedback()` for all sources
2. **ReviewsDialog component**: Updated to use Registry VP client instead of broken `getReviewsForServer` action  
3. **Removed unused imports**: Cleaned up Analytics API imports that were no longer needed

The Registry VP API (`/vp/servers/{id}/feedback`) is fully implemented and working, unlike the Analytics API which only had TODO placeholders. 