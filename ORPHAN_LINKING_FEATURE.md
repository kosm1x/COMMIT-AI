# Orphan Items Always Visible for Linking

## Issue
Orphan items (goals, objectives, tasks without parents) were only visible in certain selection states, making it difficult to link them to parent categories.

## Solution
Made orphaned sections **always visible** regardless of selection state, allowing users to easily link orphaned items to parents at any time.

## Changes Applied

### 1. GoalsColumn - Orphaned Goals Section
**Before:**
```typescript
{(!selectedVision && !selectedGoal && !selectedObjective && !selectedTask) || 
 (selectedGoal && !selectedGoal.vision_id) ||
 (selectedObjective && !selectedObjective.goal_id) ? (
  <div>
    {/* Orphaned Goals */}
  </div>
) : null}
```

**After:**
```typescript
{/* Always show orphaned goals section so users can link them to visions */}
<div>
  {/* Orphaned Goals */}
</div>
```

**Impact:** Orphaned goals are now always visible and can be edited to link to a vision at any time.

### 2. ObjectivesColumn - Orphaned Objectives Section
**Before:**
```typescript
{(!selectedVision && !selectedGoal && !selectedObjective && !selectedTask) || 
 (selectedObjective && !selectedObjective.goal_id) ? (
  <div>
    {/* Orphaned Objectives */}
  </div>
) : null}
```

**After:**
```typescript
{/* Always show orphaned objectives section so users can link them to goals */}
<div>
  {/* Orphaned Objectives */}
</div>
```

**Impact:** Orphaned objectives are now always visible and can be edited to link to a goal at any time.

### 3. TasksColumn - Orphaned Tasks Section
**Before:**
```typescript
{(!selectedVision && !selectedGoal && !selectedObjective && !selectedTask) || 
 (selectedTask && !selectedTask.objective_id) ? (
  <div>
    {/* Orphaned Tasks */}
  </div>
) : null}
```

**After:**
```typescript
{/* Always show orphaned tasks section so users can link them to objectives */}
<div>
  {/* Orphaned Tasks */}
</div>
```

**Impact:** Orphaned tasks are now always visible and can be edited to link to an objective at any time.

### 4. Simplified Filtering Logic
Removed conditional logic for showing/hiding orphaned sections:
- Removed `shouldShowOrphanedGoalsSection` variable (no longer needed)
- Removed `shouldShowOrphanedSection` variable (no longer needed)
- Simplified `allGoals`, `allObjectives` to always exclude orphans from main list
- Orphaned items are ONLY shown in their dedicated "Orphaned" sections

## How It Works

### Linking Orphaned Items
1. **Find orphaned item** in its dedicated section (always visible)
2. **Click edit** (pencil icon)
3. **Select parent** from dropdown:
   - Goals: Select Vision (or leave as "No Vision (Orphaned)")
   - Objectives: Select Goal (or leave as "No Goal (Orphaned)")
   - Tasks: Select Objective (or leave as "No Objective (Orphaned)")
4. **Save** - Item moves from orphaned section to parent's section

### Visual Organization
- **Main sections**: Show items linked to selected parent
- **Orphaned sections**: Always visible at bottom of each column
- **Collapsible**: Click chevron to expand/collapse orphaned sections
- **Count indicator**: Shows number of orphaned items: "Orphaned Goals (3)"

## Benefits

✅ **Always accessible** - No more hunting for orphaned items
✅ **Easy linking** - Can link orphans to parents regardless of current selection
✅ **Clear organization** - Orphaned items clearly separated from linked items
✅ **Consistent UX** - Same behavior across all three hierarchies (Vision→Goal→Objective→Task)
✅ **No lost items** - Orphaned items never disappear from view

## Files Modified
- `src/pages/Objectives.tsx`
  - Updated GoalsColumn orphaned section visibility (removed conditional)
  - Updated ObjectivesColumn orphaned section visibility (removed conditional)
  - Updated TasksColumn orphaned section visibility (removed conditional)
  - Simplified filtering logic for `allGoals` and `allObjectives`
  - Removed unused variables

## User Workflow Example

**Scenario:** User creates an objective without selecting a goal first

**Before (Old Behavior):**
1. Objective becomes orphaned
2. Orphaned section only visible when nothing is selected
3. If user selects a vision or goal, orphaned objective disappears
4. User must deselect everything to see orphan again
5. Confusing and frustrating

**After (New Behavior):**
1. Objective becomes orphaned
2. Appears in "Orphaned Objectives" section (always visible)
3. User can select any vision/goal - orphaned section remains visible
4. User clicks edit on orphaned objective
5. Selects parent goal from dropdown
6. Saves - objective moves to goal's section
7. Clear and intuitive workflow

