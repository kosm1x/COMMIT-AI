import { Network, Lightbulb, TrendingUp, Lock } from 'lucide-react';

interface ComingSoonProps {
  section: 'mindmap' | 'ideate' | 'track';
}

const sectionDetails = {
  mindmap: {
    icon: Network,
    title: 'MindMap',
    subtitle: 'Visualize Your Thoughts',
    description:
      'Transform your journal entries into interactive mind maps. See connections between your goals, objectives, and tasks in a visual Kanban board.',
    features: [
      'Interactive visual mind maps generated from your journal',
      'Kanban board with Goal-Objective-Task hierarchy',
      'Drag and drop tasks between columns',
      'AI-detected connections between entries',
      'Theme recognition and pattern visualization',
    ],
    mockup: (
      <div className="relative bg-white rounded-xl shadow-2xl p-6 border border-gray-200">
        <div className="mb-4 flex gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
          <div className="w-2 h-2 bg-green-500 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {['Goals', 'Objectives', 'Tasks'].map((col) => (
            <div key={col} className="space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">{col}</h3>
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="bg-gradient-to-br from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-200"
                >
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  ideate: {
    icon: Lightbulb,
    title: 'Ideate',
    subtitle: 'Creative Problem Solving',
    description:
      'Brainstorm solutions and generate ideas with AI assistance. Get intelligent categorization, relevance ranking, and research augmentation.',
    features: [
      'Rapid brainstorming interface',
      'AI-powered idea categorization',
      'Feasibility and impact ranking',
      'Automatic connection to your goals',
      'Research augmentation and creativity exercises',
    ],
    mockup: (
      <div className="relative bg-white rounded-xl shadow-2xl p-6 border border-gray-200">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          </div>
          <Lightbulb className="w-5 h-5 text-yellow-500" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200 flex items-start gap-3"
            >
              <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                <div className="h-2 bg-gray-100 rounded w-2/3" />
              </div>
              <div className="flex gap-1">
                <div className="w-6 h-6 bg-green-100 rounded" />
                <div className="w-6 h-6 bg-blue-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  track: {
    icon: TrendingUp,
    title: 'Track',
    subtitle: 'Progress & Habits',
    description:
      'Automatically track your progress with AI-extracted metrics. Visualize trends, build habits, and celebrate milestones.',
    features: [
      'Automatic metric extraction from journal entries',
      'Beautiful progress visualizations',
      'Habit tracking with streak counters',
      'Pattern recognition for behavior insights',
      'Personalized micro-habit suggestions',
    ],
    mockup: (
      <div className="relative bg-white rounded-xl shadow-2xl p-6 border border-gray-200">
        <div className="mb-4 flex gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
          <div className="w-2 h-2 bg-green-500 rounded-full" />
        </div>
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <div className="h-3 bg-gray-200 rounded w-32" />
              <div className="h-6 bg-green-600 rounded-full w-12 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
            <div className="h-2 bg-gray-200 rounded-full w-full overflow-hidden">
              <div className="h-full bg-green-600 rounded-full w-2/3" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={`aspect-square rounded ${
                  i < 5 ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-6 bg-gray-100 rounded w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
};

export default function ComingSoon({ section }: ComingSoonProps) {
  const details = sectionDetails[section];
  const Icon = details.icon;

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6 relative">
            <Icon className="w-10 h-10 text-white" />
            <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-2">
              <Lock className="w-4 h-4 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">{details.title}</h1>
          <p className="text-xl text-gray-600 mb-4">{details.subtitle}</p>
          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium">
            <Lock className="w-4 h-4" />
            Coming Soon
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
          <p className="text-lg text-gray-700 mb-6">{details.description}</p>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Features</h3>
          <ul className="space-y-3">
            {details.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                </div>
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Preview</h3>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
            <div className="blur-sm">{details.mockup}</div>
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="bg-white rounded-xl shadow-2xl px-8 py-6 text-center">
                <Lock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-900">
                  This feature is under development
                </p>
                <p className="text-gray-600 mt-2">We're working hard to bring this to you!</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-3">Want Early Access?</h3>
          <p className="text-blue-100 mb-6">
            Stay tuned for updates on when this feature will be available. Continue using the
            Journal and Objectives sections to build your personal growth foundation.
          </p>
          <div className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-medium">
            Focus on active sections to maximize your progress
          </div>
        </div>
      </div>
    </div>
  );
}
