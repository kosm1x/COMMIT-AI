# Toggle Selection Feature for Goals Page

## Feature Request
Allow selection and de-selection of task, objective, goal, and vision cards as in the Kanban board.

## Implementation

### Pattern from Kanban Board
In the Kanban board (`VisionsKanban.tsx` line 202):
```typescript
onClick={(e) => {
  e.stopPropagation();
  onSelectVision(isSelected ? null : vision.id);
}}
```

This allows clicking a selected card to deselect it (set to `null`).

### Changes Applied

Updated all four selection handlers in `src/pages/Objectives.tsx`:

#### 1. `handleSelectVision`
```typescript
const handleSelectVision = (vision: Vision) => {
  // Toggle: if already selected, deselect (set to null)
  if (selectedVision?.id === vision.id) {
    setSelectedVision(null);
    setSelectedGoal(null);
    setSelectedObjective(null);
    setSelectedTask(null);
  } else {
    setSelectedVision(vision);
    setSelectedGoal(null);
    setSelectedObjective(null);
    setSelectedTask(null);
  }
};
```

#### 2. `handleSelectGoal`
```typescript
const handleSelectGoal = (goal: Goal) => {
  // Toggle: if already selected, deselect (set to null)
  if (selectedGoal?.id === goal.id) {
    setSelectedGoal(null);
    setSelectedObjective(null);
    setSelectedTask(null);
  } else {
    setSelectedGoal(goal);
    setSelectedObjective(null);
    setSelectedTask(null);
  }
};
```

#### 3. `handleSelectObjective`
```typescript
const handleSelectObjective = (objective: Objective) => {
  // Toggle: if already selected, deselect (set to null)
  if (selectedObjective?.id === objective.id) {
    setSelectedObjective(null);
    setSelectedTask(null);
  } else {
    setSelectedObjective(objective);
    setSelectedTask(null);
  }
};
```

#### 4. `handleSelectTask`
```typescript
const handleSelectTask = (task: Task) => {
  // Toggle: if already selected, deselect (set to null)
  if (selectedTask?.id === task.id) {
    setSelectedTask(null);
  } else {
    setSelectedTask(task);
  }
};
```

## Behavior

### Selection (First Click)
- Click any card → It becomes selected
- Visual indicator: Ring/border highlight
- Filters related items in other columns

### Deselection (Second Click on Same Card)
- Click the same selected card → It becomes deselected
- Visual indicator removed
- Clears child selections (maintains hierarchy)
- Returns to default view state

### Hierarchy Preservation
When deselecting:
- **Vision**: Clears goal, objective, and task selections
- **Goal**: Clears objective and task selections  
- **Objective**: Clears task selection
- **Task**: Only clears task selection

## Benefits
✅ Consistent UX with Kanban board
✅ Easy way to return to default view
✅ No need to click elsewhere to clear selection
✅ Intuitive toggle behavior
✅ Maintains selection hierarchy rules

## Files Modified
- `src/pages/Objectives.tsx`: Updated all 4 selection handler functions (lines ~1276-1310)

## Testing
1. Click a vision card → It selects
2. Click the same vision card again → It deselects
3. Repeat for goals, objectives, and tasks
4. Verify child selections clear when parent is deselected
5. Verify visual indicators (ring/border) toggle correctly
