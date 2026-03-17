# COMMIT Journal - Personal Growth Companion

A beautiful, minimal journaling application based on the COMMIT framework (Context, Objectives, MindMap, Ideate, Track) designed to promote emotional clarity, goal achievement, and personal development.

## Features

### Complete COMMIT Framework Implementation

#### Journal Section (Context) ✅
- Distraction-free writing interface
- Auto-save functionality (3-second debounce)
- Calendar view of entries
- **AI-Powered Analysis** - Analyze journal entries on-demand to get:
  - Emotion detection with intensity scores
  - Pattern recognition across entries
  - Personalized coping strategies
- Beautiful visualizations of emotional insights
- Primary emotion tracking

#### Objectives Section ✅
- Complete Vision → Goal → Objective → Task hierarchy
- Four-column layout for easy management
- Priority assignment (High, Medium, Low)
- Status tracking (Not Started, In Progress, Completed, On Hold)
- Due date management for tasks
- **Recurring Tasks** - Mark tasks as recurring for daily habits
  - "Mark Completed Today" button for recurring tasks
  - Separate tracking via task_completions table
  - Perfect for building consistent habits
- Progress visualization with task counts
- Quick-add forms for each level
- Orphaned items support (items without parents)
- Clickable titles to create mind maps or ideas
- Inline editing for all items

#### MindMap Section ✅
- **AI-Generated Mind Maps** - Enter a problem statement, get a visual mind map
- **Kanban Boards** - Visual boards for Visions, Goals, Objectives, and Tasks
  - Drag-and-drop status management
  - Status columns with color coding
  - Recurring task indicators
- Saved mind maps history
- Fullscreen mode for detailed exploration
- Create Goals, Objectives, or Tasks directly from mind map nodes
- Theme-aware Mermaid diagram rendering

#### Ideate Section ✅
- **AI-Powered Idea Expansion** - Start with a simple thought, get a full concept
- Idea library with search and filtering
- Category and tag management
- Connection detection between ideas
- AI suggestions for idea enhancement
- Detailed idea editor with AI assistant panel
- Export ideas (TXT, Markdown, JSON)

#### Track Section ✅
- **Daily View** - Today's tasks, completion tracking, recurring task management
- **Weekly View** - Week overview with daily breakdown and completion rates
- **Monthly View** - Activity heatmap, monthly summaries, progress metrics
- **Kanban Overview** - Status distribution across all items
- Streak tracking (consecutive days with completions)
- Completion rate calculations
- Upcoming deadlines tracking
- Active goals counter

## Technology Stack

- **Frontend**: React 18.3.1 + TypeScript 5.5.3
- **Styling**: Tailwind CSS 3.4.1 with custom dark mode support
- **Icons**: Lucide React 0.344.0
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password)
- **AI**: Groq Qwen 3.2 (via Groq API)
- **Visualization**: Mermaid 11.12.1 (for mind maps)
- **Build Tool**: Vite 5.4.21
- **Routing**: React Router DOM 7.9.6

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account
- (Optional) Groq API key for AI features

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env`:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Database Schema

The application uses the following tables:

- **journal_entries** - Stores all user journal entries
- **ai_analysis** - Stores AI-generated emotional analysis
- **visions** - Long-term aspirations
- **goals** - Major milestones linked to visions
- **objectives** - Specific targets linked to goals
- **tasks** - Concrete actions linked to objectives
  - Includes `is_recurring` flag for habit tracking
- **task_completions** - Daily completion tracking for recurring tasks
- **ideas** - Captured and expanded ideas
- **idea_connections** - Relationships between ideas
- **idea_ai_suggestions** - AI-generated idea enhancements
- **mind_maps** - Saved mind map visualizations

All tables have Row Level Security (RLS) enabled to ensure data privacy.

## AI Integration

### Using Groq Qwen 3.2

The app integrates with Groq's Qwen 3.2 model for intelligent analysis:

1. Get your API key from [Groq Console](https://console.groq.com/)
2. Set it as a Supabase Edge Function secret: `supabase secrets set GROQ_API_KEY=your_key`
3. Deploy the Edge Function: `supabase functions deploy ai-proxy`
4. The AI will:
   - Analyze journal entries for emotions and patterns (using thinking mode for complex reasoning)
   - Suggest coping strategies
   - Extract potential goals from your writing
   - Generate mind maps and idea expansions
   - Provide critical analysis and related concepts

### Fallback Mode

If no API key is provided, the app uses intelligent mock analysis based on keyword detection to demonstrate the UI without requiring API access.

## Design Philosophy

- **Minimal & Beautiful** - Clean interface using professional blues, greens, and warm neutrals
- **High-Contrast Dark Mode** - Pure black backgrounds with white text for maximum readability
- **Theme Toggle** - Seamless switching between light and dark modes
- **Distraction-Free** - Focus on content, not formatting
- **Natural Language** - Write naturally without special tags or syntax
- **AI That Adapts** - Invisible AI that enhances without interrupting
- **Mobile-First** - Responsive design that works everywhere
- **Glassmorphic Design** - Modern glass-effect cards with backdrop blur

## Security

- All user data is protected with Row Level Security
- Authentication handled by Supabase Auth
- API keys never exposed to client-side code
- Secure session management

## Development

### Project Structure

```
src/
├── components/       # Reusable UI components
├── contexts/         # React contexts (Auth)
├── lib/             # Utilities and configurations
├── pages/           # Main application pages
├── services/        # External service integrations
└── App.tsx          # Main application component
```

### Key Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Type check with TypeScript

## User Guide

For a comprehensive, non-technical guide to using the COMMIT method, see **[COMMIT_METHOD_GUIDE.md](./COMMIT_METHOD_GUIDE.md)**.

This guide explains:
- What each phase of COMMIT means
- How to use each feature
- Best practices for personal growth
- How the phases work together
- Getting started tips

## Contributing

The COMMIT framework is now fully implemented with all five phases:
- ✅ Context (Journal)
- ✅ Objectives (Vision → Goals → Objectives → Tasks)
- ✅ MindMap (AI-generated mind maps and Kanban boards)
- ✅ Ideate (AI-powered idea expansion)
- ✅ Track (Daily, Weekly, Monthly progress tracking)

Future enhancements may include:
- Advanced analytics and insights
- Export and sharing features
- Mobile app (PWA)
- Collaborative features

## License

MIT

## Key Features Highlights

### Recurring Tasks
Perfect for building daily habits! Mark any task as recurring, and you can complete it each day without it disappearing. Track your consistency and build momentum.

### Dark Mode
High-contrast dark theme for comfortable use in any lighting condition. Your preference is automatically saved and persists across sessions.

### AI Integration
- **Journal Analysis**: Discover emotional patterns and coping strategies
- **Mind Map Generation**: Transform problems into visual solutions
- **Idea Expansion**: Turn rough thoughts into fully-formed concepts
- **Connection Detection**: Find relationships between your ideas

### Visual Progress Tracking
- Activity heatmaps show your consistency
- Completion rates help you adjust your approach
- Streak counters keep you motivated
- Status overviews show where everything stands

## Acknowledgments

Based on the COMMIT Journaling Method 3.0 framework for AI-enhanced personal growth and development.
