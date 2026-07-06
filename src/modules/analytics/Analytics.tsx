import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';

export const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [hoursData, setHoursData] = useState<{ day: string; hours: number }[]>([]);
  const [subjectData, setSubjectData] = useState<{ name: string; value: number }[]>([]);
  const [skillsData, setSkillsData] = useState<{ category: string; value: number }[]>([]);
  const [completedAssignments, setCompletedAssignments] = useState<number>(0);
  const [pendingAssignments, setPendingAssignments] = useState<number>(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const pomodoro = await db.getAll('pomodoro');
      const assignments = await db.getAll('assignments');
      const attendance = await db.getAll('attendance');

      // 1. Calculate study hours per day (Line chart)
      const dayMap: { [key: string]: number } = {
        'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
      };
      
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      pomodoro.forEach(log => {
        const date = new Date(log.timestamp);
        const dayName = weekdays[date.getDay()];
        if (dayMap[dayName] !== undefined) {
          // Detect unit: if duration is > 180, it's likely stored in seconds instead of minutes
          const minutes = log.duration > 180 ? log.duration / 60 : log.duration;
          dayMap[dayName] += minutes / 60; // Convert to hours
        }
      });

      const lineChartData = Object.keys(dayMap).map(day => ({
        day,
        hours: Math.round(dayMap[day] * 10) / 10
      }));

      // Set exact study hours data dynamically
      setHoursData(lineChartData);

      // 2. Count subjects assignments (Donut chart)
      const subMap: { [key: string]: number } = {};
      assignments.forEach(a => {
        subMap[a.subject] = (subMap[a.subject] || 0) + 1;
      });

      const donutData = Object.keys(subMap).map(name => ({
        name,
        value: subMap[name]
      })).slice(0, 5);

      setSubjectData(donutData);

      // 3. Dynamic Skills matrices (radar chart categories)
      const goals = await db.getAll('goals');
      const goalProgressAvg = goals.length > 0 ? (goals.reduce((acc, curr) => acc + curr.progress, 0) / goals.length) : 0;

      const habits = await db.getAll('habits');
      const habitCompletionRate = habits.length > 0 ? (habits.reduce((acc, curr) => acc + curr.datesCompleted.length, 0) / (habits.length * 30)) * 100 : 0;

      const skills = [
        { category: 'Punctuality', value: attendance.length > 0 ? Math.min(100, attendance.reduce((acc, curr) => acc + (curr.total > 0 ? (curr.attended / curr.total) * 100 : 0), 0) / attendance.length) : 0 },
        { category: 'Tasks Done', value: assignments.length > 0 ? (assignments.filter(a => a.status === 'submitted' || a.status === 'graded').length / assignments.length) * 100 : 0 },
        { category: 'Focus Time', value: pomodoro.length > 0 ? Math.min(100, (pomodoro.reduce((acc, curr) => acc + curr.duration, 0) / 1200) * 100) : 0 },
        { category: 'Goal OKRs', value: Math.min(100, goalProgressAvg) },
        { category: 'Habits Done', value: Math.min(100, habitCompletionRate) }
      ];
      setSkillsData(skills);

      // 4. Assignments state
      setCompletedAssignments(assignments.filter(a => a.status === 'submitted' || a.status === 'graded').length);
      setPendingAssignments(assignments.filter(a => a.status === 'todo' || a.status === 'progress').length);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="state-container">
        <div className="state-loading-spinner" />
        <p>Crunching dashboard analytics...</p>
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h2 style={{ fontSize: '18px' }}>📊 Study Performance & Analytics</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Assess time investment trends, tasks productivity metrics, and subject rankings.</p>
        </div>
        <button className="btn" onClick={loadData}>🔄 Refresh Stats</button>
      </div>

      <div className="module-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', overflowY: 'auto' }}>
        
        {/* CHART 1: Study hours (Line chart) */}
        <div className="glass-panel" style={{ height: '300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '13px', color: 'var(--accent-color)' }}>📈 Weekly Study Hours</h4>
          <div style={{ flex: 1 }}>
            <LineChart data={hoursData} />
          </div>
        </div>

        {/* CHART 2: Subject Time distribution (Donut chart) */}
        <div className="glass-panel" style={{ height: '300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '13px', color: 'var(--success)' }}>🍩 Assignment Density per Course</h4>
          <div style={{ flex: 1 }}>
            <DonutChart data={subjectData} />
          </div>
        </div>

        {/* CHART 3: Academic skill matrices (Radar Chart) */}
        <div className="glass-panel" style={{ height: '300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '13px', color: '#7b2cbf' }}>🕸️ Scholar Skill Matrices</h4>
          <div style={{ flex: 1 }}>
            <RadarChart data={skillsData} />
          </div>
        </div>

        {/* CHART 4: Task metrics bar comparison */}
        <div className="glass-panel" style={{ height: '300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '13px', color: 'var(--warning)' }}>📊 Assignment Ratios</h4>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--success)' }}>{completedAssignments}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Completed</span>
            </div>
            
            {/* Simple SVG Bar chart side-by-side */}
            <svg width="100" height="150" viewBox="0 0 100 150">
              <defs>
                <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
                <linearGradient id="pendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
              </defs>
              <rect x="15" y={150 - Math.max(10, (completedAssignments / Math.max(1, completedAssignments + pendingAssignments)) * 120)} width="25" height={Math.max(10, (completedAssignments / Math.max(1, completedAssignments + pendingAssignments)) * 120)} rx="3" fill="url(#compGrad)" />
              <rect x="60" y={150 - Math.max(10, (pendingAssignments / Math.max(1, completedAssignments + pendingAssignments)) * 120)} width="25" height={Math.max(10, (pendingAssignments / Math.max(1, completedAssignments + pendingAssignments)) * 120)} rx="3" fill="url(#pendGrad)" />
              <line x1="5" y1="149" x2="95" y2="149" stroke="var(--glass-border)" strokeWidth="2" />
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--error)' }}>{pendingAssignments}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pending</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

/* --- SUB COMPONENT: SVG LINE CHART --- */
interface LineData {
  day: string;
  hours: number;
}
const LineChart: React.FC<{ data: LineData[] }> = ({ data }) => {
  const width = 450;
  const height = 200;
  const padding = 35;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalHours = data.reduce((acc, curr) => acc + curr.hours, 0);
  if (totalHours === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '12px', gap: '8px' }}>
        <span>📈 No focus sessions recorded this week.</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Complete Pomodoro study blocks to populate stats.</span>
      </div>
    );
  }

  // Capped daily limit at 24 hours
  const maxHours = 24;
  
  // Calculate coordinates
  const points = data.map((d, index) => {
    const x = padding + (index * (width - 2 * padding)) / (data.length - 1);
    const clampedHours = Math.min(maxHours, d.hours);
    const y = height - padding - (clampedHours * (height - 2 * padding)) / maxHours;
    return { x, y, label: d.day, val: d.hours };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--glass-border)" />
      <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" />
      <line x1={padding} y1={(padding + height - padding)/2} x2={width - padding} y2={(padding + height - padding)/2} stroke="rgba(255,255,255,0.03)" />

      {/* Y-Axis Scales */}
      <text x={padding - 6} y={padding + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">24h</text>
      <text x={padding - 6} y={(padding + height - padding)/2 + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">12h</text>
      <text x={padding - 6} y={height - padding + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">0h</text>

      {/* Gradient Area */}
      <path d={areaD} fill="url(#lineGrad)" />

      {/* Stroke path */}
      <path d={pathD} fill="none" stroke="var(--accent-color)" strokeWidth="3" strokeLinecap="round" />

      {/* Data points */}
      {points.map((p, i) => {
        const isHovered = hoveredIndex === i;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={isHovered ? "7" : "4"} fill="var(--bg-color)" stroke="var(--accent-color)" strokeWidth={isHovered ? "3" : "2"} style={{ transition: 'r 0.1s ease' }} />
            <text x={p.x} y={height - 8} fill="var(--text-secondary)" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">
              {p.label}
            </text>
            
            {/* Show simple value indicator above point if not hovered */}
            {!isHovered && p.val > 0 && (
              <text x={p.x} y={p.y - 8} fill="#fff" fontSize="8" textAnchor="middle" fontWeight="bold">
                {p.val}h
              </text>
            )}

            {/* Hover Trigger Box */}
            <circle
              cx={p.x}
              cy={p.y}
              r="16"
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />

            {/* Hover Tooltip display */}
            {isHovered && (
              <g style={{ pointerEvents: 'none' }}>
                <rect
                  x={p.x - 45}
                  y={p.y - 42}
                  width="90"
                  height="26"
                  rx="6"
                  fill="rgba(30, 31, 41, 0.98)"
                  stroke="var(--accent-color)"
                  strokeWidth="1.5"
                />
                <text
                  x={p.x}
                  y={p.y - 26}
                  fill="#fff"
                  fontSize="10"
                  textAnchor="middle"
                  fontWeight="bold"
                  fontFamily="var(--font-sans)"
                >
                  {p.val} study hrs
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

/* --- SUB COMPONENT: SVG DONUT CHART --- */
interface DonutData {
  name: string;
  value: number;
}
const DonutChart: React.FC<{ data: DonutData[] }> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '12px', gap: '8px' }}>
        <span>📊 No assignments logged yet.</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Add tasks in the Assignments module.</span>
      </div>
    );
  }

  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const colors = ['#00c3ff', '#10b981', '#f59e0b', '#7b2cbf', '#ef4444'];
  const radius = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  
  let accumulatedPercent = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', justifyContent: 'space-around' }}>
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r={radius} fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth={strokeWidth} />
        {data.map((d, index) => {
          const percent = total > 0 ? (d.value / total) * 100 : 0;
          const strokeOffset = circumference - (percent / 100) * circumference;
          const rotation = (accumulatedPercent / 100) * 360 - 90;
          accumulatedPercent += percent;

          return (
            <circle
              key={index}
              cx="75"
              cy="75"
              r={radius}
              fill="transparent"
              stroke={colors[index % colors.length]}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              transform={`rotate(${rotation} 75 75)`}
              strokeLinecap="round"
            />
          );
        })}
        {/* Center label */}
        <text x="75" y="80" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">
          {total} Tasks
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
        {data.map((d, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '20%', background: colors[index % colors.length] }} />
            <span>{d.name.substring(0, 12)} ({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* --- SUB COMPONENT: SVG RADAR CHART --- */
interface RadarData {
  category: string;
  value: number;
}
const RadarChart: React.FC<{ data: RadarData[] }> = ({ data }) => {
  const width = 220;
  const height = 220;
  const cx = width / 2;
  const cy = height / 2;
  const r = 80; // max radius

  const levels = [0.2, 0.4, 0.6, 0.8, 1];
  const angleStep = (Math.PI * 2) / data.length;

  // Grid background pentagons/rings
  const gridRings = levels.map((lvl, index) => {
    const points = data.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + Math.cos(angle) * r * lvl;
      const y = cy + Math.sin(angle) * r * lvl;
      return `${x},${y}`;
    }).join(' ');
    
    return <polygon key={index} points={points} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
  });

  // Category labels and lines
  const labelsAndSpokes = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const xSpoke = cx + Math.cos(angle) * r;
    const ySpoke = cy + Math.sin(angle) * r;
    const xLabel = cx + Math.cos(angle) * (r + 14);
    const yLabel = cy + Math.sin(angle) * (r + 14);

    return (
      <g key={i}>
        <line x1={cx} y1={cy} x2={xSpoke} y2={ySpoke} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <text 
          x={xLabel} 
          y={yLabel + 4} 
          fill="var(--text-secondary)" 
          fontSize="8" 
          textAnchor="middle"
          fontWeight="500"
        >
          {d.category}
        </text>
      </g>
    );
  });

  // Value polygon
  const valuePoints = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const valueRadius = r * (d.value / 100);
    const x = cx + Math.cos(angle) * valueRadius;
    const y = cy + Math.sin(angle) * valueRadius;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ display: 'flex', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
      <svg width={width} height={height}>
        {gridRings}
        {labelsAndSpokes}
        <polygon points={valuePoints} fill="rgba(123, 44, 191, 0.25)" stroke="#7b2cbf" strokeWidth="2" />
        {/* Draw dots */}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const valueRadius = r * (d.value / 100);
          const x = cx + Math.cos(angle) * valueRadius;
          const y = cy + Math.sin(angle) * valueRadius;
          return <circle key={i} cx={x} cy={y} r="3" fill="#fff" stroke="#7b2cbf" strokeWidth="1.5" />;
        })}
      </svg>
    </div>
  );
};
