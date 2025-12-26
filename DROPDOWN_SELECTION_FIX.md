# Fix: Orphaned Goals Can Now Be Selected in Dropdown

## Issue
User could see orphaned goals in the dropdown menu when editing an objective, but couldn't select and assign them before saving.

## Root Cause
1. **Timing Issue**: Orphaned goals were only loaded when `showOrphaned` was `true` (when orphaned section is expanded). If the user opened edit mode before expanding the orphaned section, orphaned goals weren't loaded yet.

2. **Missing Combined Array**: One instance where orphaned objectives were receiving just `goals` instead of `[...goals, ...orphanedGoals]`, so orphaned goals weren't available in the dropdown.

## Solution Applied

### 1. Always Load Orphaned Items
**Before:**
```typescript
useEffect(() => {
  if (showOrphaned) {
    loadOrphanedObjectives().then(setOrphanedObjectives);
    loadOrphanedGoals().then(setOrphanedGoals);
  }
}, [showOrphaned, objectives, goals, ...]);
```

**After:**
```typescript
useEffect(() => {
  // Always load orphaned goals and objectives so they're available for linking
  loadOrphanedObjectives().then(setOrphanedObjectives);
  loadOrphanedGoals().then(setOrphanedGoals);
}, [objectives, goals, loadOrphanedObjectives, loadOrphanedGoals]);
```

**Impact:** Orphaned goals and objectives are now always loaded, ensuring they're available in dropdowns regardless of whether the orphaned section is expanded.

### 2. Fixed Missing Combined Array
**Before:**
```typescript
// In orphaned objectives section
goals={goals}  // Missing orphaned goals!
```

**After:**
```typescript
// In orphaned objectives section
goals={[...goals, ...orphanedGoals]}  // Includes all goals
```

**Impact:** Orphaned objectives now receive the complete list of goals (including orphaned ones) for their dropdown menus.

## Result

✅ **Orphaned goals always loaded** - Available immediately when editing
✅ **Orphaned goals selectable** - Can be selected and assigned in dropdown
✅ **Consistent behavior** - Works for both regular and orphaned objectives
✅ **No timing issues** - Orphaned items loaded regardless of UI state

## Files Modified
- `src/pages/Objectives.tsx`
  - Changed useEffect to always load orphaned goals/objectives (removed `showOrphaned` condition)
  - Fixed orphaned objectives to receive combined goals array

## Testing
1. Create an orphaned goal
2. Create an orphaned objective
3. Edit the orphaned objective
4. Open the "Goal" dropdown
5. Select the orphaned goal → Should work immediately ✅
6. Save → Objective should be linked to orphaned goal ✅
