import { Heart } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useCreativeData } from '../../../hooks/useCreativeData';
import { useMemo, useState } from 'react';

interface EmotionChartProps {
  selectedDate: Date;
  viewMode: 'daily' | 'weekly' | 'monthly';
}

export default function EmotionChart({ selectedDate, viewMode }: EmotionChartProps) {
  const { t, language } = useLanguage();
  const { emotionData, periodEmotionData, dailyActivity, loading } = useCreativeData(selectedDate, viewMode);
  const [hoveredPoint, setHoveredPoint] = useState<{ emotion: string; value: number; date: string; x: number; y: number } | null>(null);

  // Filter emotion data to the last 3 months and compute chart data
  const chartData = useMemo(() => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    threeMonthsAgo.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Filter emotions to last 3 months
    const filteredEmotions = emotionData.filter(e => {
      if (!e || !e.date) return false;
      const emotionDate = new Date(e.date);
      return emotionDate >= threeMonthsAgo && emotionDate <= today;
    });

    // Build date-emotion map
    const dateEmotionMap = new Map<string, Map<string, number[]>>();
    filteredEmotions.forEach(e => {
      const dateKey = new Date(e.date).toISOString().split('T')[0];
      if (!dateEmotionMap.has(dateKey)) {
        dateEmotionMap.set(dateKey, new Map());
      }
      const emotionMap = dateEmotionMap.get(dateKey)!;
      if (!emotionMap.has(e.emotion)) {
        emotionMap.set(e.emotion, []);
      }
      emotionMap.get(e.emotion)!.push(e.intensity);
    });

    // Get unique dates with data (sorted chronologically)
    const datesWithData = Array.from(dateEmotionMap.keys()).sort();
    
    // Get unique emotions, prioritize by frequency
    const emotionCounts = new Map<string, number>();
    filteredEmotions.forEach(e => {
      emotionCounts.set(e.emotion, (emotionCounts.get(e.emotion) || 0) + 1);
    });
    const sortedEmotions = Array.from(emotionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([emotion]) => emotion);

    // Build emotion lines
    const emotionLines = sortedEmotions.slice(0, 8).map(emotion => {
      const points = datesWithData.map(date => {
        const intensities = dateEmotionMap.get(date)?.get(emotion) || [];
        return {
          date,
          value: intensities.length > 0 
            ? intensities.reduce((sum, val) => sum + val, 0) / intensities.length 
            : null
        };
      });
      return { emotion, points };
    });

    // Calculate max intensity for scaling
    const maxIntensity = Math.max(
      ...emotionLines.flatMap(line => 
        line.points.filter(p => p.value !== null).map(p => p.value as number)
      ),
      100
    );

    return {
      filteredEmotions,
      datesWithData,
      emotionLines,
      maxIntensity,
      emotionCounts
    };
  }, [emotionData]);

  if (loading) {
    return <div className="glass-card p-4 border border-white/40 dark:border-white/10 h-48 animate-pulse bg-white/20 dark:bg-white/5" />;
  }

  const { filteredEmotions, datesWithData, emotionLines, maxIntensity, emotionCounts } = chartData;
  
  const emotionColors: { [key: string]: string } = {
    happy: '#fbbf24',
    sad: '#3b82f6',
    anxious: '#f97316',
    calm: '#10b981',
    excited: '#ec4899',
    frustrated: '#ef4444',
    hopeful: '#14b8a6',
    overwhelmed: '#6366f1',
    grateful: '#059669',
    determined: '#06b6d4',
    neutral: '#6b7280',
    angry: '#dc2626',
    joyful: '#f59e0b',
    peaceful: '#22c55e',
    worried: '#f59e0b',
  };

  const chartHeight = 180;
  const padding = { top: 15, right: 20, bottom: 40, left: 40 };
  // Dynamic chart width based on number of dates (min 300, max 600)
  const baseChartWidth = Math.min(Math.max(datesWithData.length * 25, 300), 600);

  return (
    <div className="glass-card p-4 border border-white/40 dark:border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-accent-primary" />
          <h3 className="text-sm font-heading font-bold text-text-primary">{t('tracking.emotionsOverTime')}</h3>
        </div>
        <span className="text-xs text-text-tertiary">{t('tracking.last3Months')}</span>
      </div>
      
      {filteredEmotions.length === 0 ? (
        <div className="text-center py-6 text-text-tertiary">
          <Heart className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-xs font-medium">{t('tracking.noEmotionDataFound')}</p>
          <p className="text-[10px] mt-1">{t('tracking.analyzeJournalToTrackEmotions')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Line Chart */}
          <div>
            <div className="relative w-full overflow-x-auto custom-scrollbar">
              <div className="relative" style={{ minWidth: `${baseChartWidth}px` }}>
                <svg 
                  width="100%" 
                  height={chartHeight} 
                  viewBox={`0 0 ${baseChartWidth} ${chartHeight}`} 
                  preserveAspectRatio="xMidYMid meet"
                  className="overflow-visible"
                >
                  {/* Y-axis labels */}
                  {[0, 25, 50, 75, 100].map(value => {
                    const y = chartHeight - padding.bottom - ((value / 100) * (chartHeight - padding.top - padding.bottom));
                    return (
                      <g key={value}>
                        <text
                          x={padding.left - 8}
                          y={y}
                          textAnchor="end"
                          dominantBaseline="middle"
                          className="text-[10px] fill-current text-text-tertiary"
                        >
                          {value}
                        </text>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={baseChartWidth - padding.right}
                          y2={y}
                          stroke="currentColor"
                          strokeWidth="1"
                          className="text-gray-200 dark:text-gray-700"
                          strokeDasharray={value === 0 ? "0" : "4 4"}
                          strokeOpacity={value === 0 ? 0.5 : 0.3}
                        />
                      </g>
                    );
                  })}

                  {/* Emotion lines - area fills and paths */}
                  {emotionLines.map((line, lineIndex) => {
                    const color = emotionColors[line.emotion.toLowerCase()] || `hsl(${lineIndex * 45}, 70%, 50%)`;
                    const validPoints = line.points
                      .map((point, index) => ({
                        x: index,
                        y: point.value,
                        date: point.date,
                      }))
                      .filter(p => p.y !== null);

                    if (validPoints.length === 0) return null;

                    const chartAreaWidth = baseChartWidth - padding.left - padding.right;
                    const chartAreaHeight = chartHeight - padding.top - padding.bottom;
                    const xScale = datesWithData.length > 1 ? chartAreaWidth / (datesWithData.length - 1) : chartAreaWidth;

                    const pathData = validPoints.map((point, idx) => {
                      const x = padding.left + point.x * xScale;
                      const y = chartHeight - padding.bottom - ((point.y! / maxIntensity) * chartAreaHeight);
                      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ');

                    // Area fill
                    const lastX = padding.left + validPoints[validPoints.length - 1].x * xScale;
                    const firstX = padding.left + validPoints[0].x * xScale;
                    const areaPath = pathData + ` L ${lastX} ${chartHeight - padding.bottom} L ${firstX} ${chartHeight - padding.bottom} Z`;

                    return (
                      <g key={line.emotion}>
                        <path
                          d={areaPath}
                          fill={color}
                          fillOpacity="0.08"
                        />
                        <path
                          d={pathData}
                          fill="none"
                          stroke={color}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    );
                  })}

                  {/* Emotion points - circles */}
                  {emotionLines.map((line, lineIndex) => {
                    const color = emotionColors[line.emotion.toLowerCase()] || `hsl(${lineIndex * 45}, 70%, 50%)`;
                    const validPoints = line.points
                      .map((point, index) => ({
                        x: index,
                        y: point.value,
                        date: point.date,
                      }))
                      .filter(p => p.y !== null);

                    if (validPoints.length === 0) return null;

                    const chartAreaWidth = baseChartWidth - padding.left - padding.right;
                    const chartAreaHeight = chartHeight - padding.top - padding.bottom;
                    const xScale = datesWithData.length > 1 ? chartAreaWidth / (datesWithData.length - 1) : chartAreaWidth;

                    return (
                      <g key={`${line.emotion}-points`}>
                        {validPoints.map((point, idx) => {
                          const x = padding.left + point.x * xScale;
                          const y = chartHeight - padding.bottom - ((point.y! / maxIntensity) * chartAreaHeight);
                          const dateObj = new Date(point.date);
                          const isHovered = hoveredPoint?.emotion === line.emotion && hoveredPoint?.date === point.date;
                          return (
                            <circle
                              key={idx}
                              cx={x}
                              cy={y}
                              r={isHovered ? "7" : "5"}
                              fill={color}
                              stroke="white"
                              strokeWidth={isHovered ? "3" : "2"}
                              className="cursor-pointer transition-all"
                              onMouseEnter={() => setHoveredPoint({
                                emotion: line.emotion,
                                value: point.y!,
                                date: point.date,
                                x,
                                y
                              })}
                              onMouseLeave={() => setHoveredPoint(null)}
                            >
                              <title>{`${line.emotion}: ${Math.round(point.y!)}%\n${dateObj.toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'es' ? 'es-ES' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}</title>
                            </circle>
                          );
                        })}
                      </g>
                    );
                  })}

                  {/* Hover labels - rendered last to appear on top */}
                  {hoveredPoint && (() => {
                    // Determine label position - show below for top points, above for bottom points
                    const isTopHalf = hoveredPoint.y < chartHeight / 2;
                    const connectorEnd = isTopHalf ? hoveredPoint.y + 25 : hoveredPoint.y - 25;
                    const rectY = isTopHalf ? hoveredPoint.y + 32 : hoveredPoint.y - 48;
                    const emotionTextY = isTopHalf ? hoveredPoint.y + 48 : hoveredPoint.y - 32;
                    const valueTextY = isTopHalf ? hoveredPoint.y + 60 : hoveredPoint.y - 20;
                    
                    return (
                      <g style={{ pointerEvents: 'none' }}>
                        {/* Connector line from point to label */}
                        <line
                          x1={hoveredPoint.x}
                          y1={hoveredPoint.y}
                          x2={hoveredPoint.x}
                          y2={connectorEnd}
                          stroke="rgba(0, 0, 0, 0.2)"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                        {/* Label background */}
                        <rect
                          x={hoveredPoint.x - 45}
                          y={rectY}
                          width="90"
                          height="28"
                          rx="6"
                          fill="rgba(0, 0, 0, 0.95)"
                          stroke="rgba(255, 255, 255, 0.3)"
                          strokeWidth="1.5"
                          className="dark:fill-gray-900 dark:stroke-gray-600"
                        />
                        {/* Emotion name */}
                        <text
                          x={hoveredPoint.x}
                          y={emotionTextY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-[11px] fill-white font-bold"
                          style={{ pointerEvents: 'none' }}
                        >
                          {hoveredPoint.emotion.charAt(0).toUpperCase() + hoveredPoint.emotion.slice(1)}
                        </text>
                        {/* Intensity value */}
                        <text
                          x={hoveredPoint.x}
                          y={valueTextY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-[10px] fill-gray-200"
                          style={{ pointerEvents: 'none' }}
                        >
                          {Math.round(hoveredPoint.value)}%
                        </text>
                      </g>
                    );
                  })()}

                  {/* X-axis date labels */}
                  {datesWithData.map((date, index) => {
                    // Show labels dynamically: always show first, last, and some in between
                    const totalDates = datesWithData.length;
                    const maxLabels = 12;
                    const step = Math.max(1, Math.ceil(totalDates / maxLabels));
                    const showLabel = index === 0 || index === totalDates - 1 || index % step === 0;
                    
                    if (!showLabel) return null;
                    
                    const chartAreaWidth = baseChartWidth - padding.left - padding.right;
                    const xScale = totalDates > 1 ? chartAreaWidth / (totalDates - 1) : chartAreaWidth;
                    const x = padding.left + index * xScale;
                    const dateObj = new Date(date);
                    
                    return (
                      <text
                        key={date}
                        x={x}
                        y={chartHeight - padding.bottom + 20}
                        textAnchor="middle"
                        transform={`rotate(-30, ${x}, ${chartHeight - padding.bottom + 20})`}
                        className="text-[10px] fill-current text-text-tertiary"
                      >
                        {dateObj.toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' })}
                      </text>
                    );
                  })}
                </svg>
              </div>

              {/* Legend */}
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] justify-center">
                {emotionLines.map((line, index) => {
                  const color = emotionColors[line.emotion.toLowerCase()] || `hsl(${index * 45}, 70%, 50%)`;
                  const count = emotionCounts.get(line.emotion) || 0;
                  return (
                    <div key={line.emotion} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-text-primary capitalize">{line.emotion}</span>
                      <span className="text-text-tertiary">({count})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Timeline Grid (Period specific) */}
          {viewMode !== 'daily' && (
            <div>
              <h4 className="text-xs font-semibold text-text-primary mb-2">{t('tracking.emotionTimeline')}</h4>
              <div className={`grid gap-1 grid-cols-7`}>
                {dailyActivity.map((day, index) => {
                  const dayEmotions = periodEmotionData.filter(e => {
                    if (!e || !e.date) return false;
                    const emotionDate = new Date(e.date);
                    emotionDate.setHours(0, 0, 0, 0);
                    const dayDate = new Date(day.date);
                    dayDate.setHours(0, 0, 0, 0);
                    return emotionDate.getTime() === dayDate.getTime();
                  });

                  const primaryEmotion = dayEmotions.length > 0
                    ? dayEmotions.reduce((prev, curr) => 
                        curr.intensity > prev.intensity ? curr : prev
                      ).emotion
                    : null;

                  return (
                    <div
                      key={index}
                      className="text-center"
                      title={dayEmotions.length > 0 
                        ? `${dayEmotions.length} emotions: ${dayEmotions.map(e => e.emotion).join(', ')}`
                        : 'No emotions'}
                    >
                      <div className="text-[9px] font-bold text-text-tertiary uppercase mb-0.5">
                        {viewMode === 'weekly' 
                          ? day.date.toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'es' ? 'es-ES' : 'en-US', { weekday: 'narrow' })
                          : day.date.getDate()}
                      </div>
                      <div className={`h-5 rounded flex items-center justify-center ${
                        primaryEmotion 
                          ? (emotionColors[primaryEmotion.toLowerCase()] || 'bg-gray-300 dark:bg-gray-700')
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`} style={primaryEmotion ? { backgroundColor: emotionColors[primaryEmotion.toLowerCase()] } : {}}>
                        {primaryEmotion && (
                          <span className="text-[8px] font-bold text-white drop-shadow-sm">
                            {primaryEmotion.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

