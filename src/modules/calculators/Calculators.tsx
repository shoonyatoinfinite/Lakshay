import React, { useState, useEffect } from 'react';
import { sounds } from '../../utils/sounds';

type CalcTab = 'scientific' | 'programmer' | 'matrix' | 'statistics' | 'unit' | 'gpa';

export const Calculators: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CalcTab>('scientific');

  return (
    <div className="module-container">
      {/* Tabs */}
      <div 
        className="module-header" 
        style={{ 
          padding: '8px 16px', 
          borderBottom: '1px solid var(--glass-border)', 
          background: 'rgba(0,0,0,0.15)',
          justifyContent: 'flex-start',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        {(['scientific', 'programmer', 'matrix', 'statistics', 'unit', 'gpa'] as CalcTab[]).map(tab => (
          <button
            key={tab}
            className="btn"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              border: 'none',
              background: activeTab === tab ? 'rgba(var(--accent-color-rgb), 0.2)' : 'transparent',
              color: activeTab === tab ? 'var(--accent-color)' : 'var(--text-secondary)'
            }}
            onClick={() => { setActiveTab(tab); sounds.playClick(); }}
          >
            {tab === 'scientific' && '🧮 Scientific'}
            {tab === 'programmer' && '💻 Programmer'}
            {tab === 'matrix' && '🔲 Matrix'}
            {tab === 'statistics' && '📈 Stats'}
            {tab === 'unit' && '⚖️ Unit'}
            {tab === 'gpa' && '🎓 CGPA/SGPA'}
          </button>
        ))}
      </div>

      <div className="module-body" style={{ overflowY: 'auto', padding: '20px' }}>
        {activeTab === 'scientific' && <ScientificCalc />}
        {activeTab === 'programmer' && <ProgrammerCalc />}
        {activeTab === 'matrix' && <MatrixCalc />}
        {activeTab === 'statistics' && <StatisticsCalc />}
        {activeTab === 'unit' && <UnitCalc />}
        {activeTab === 'gpa' && <GPACalc />}
      </div>
    </div>
  );
};

/* --- 1. SCIENTIFIC CALCULATOR --- */
const ScientificCalc: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [activePressedKey, setActivePressedKey] = useState<string | null>(null);

  const press = (val: string) => {
    setDisplay(prev => {
      if (prev === '0' || prev === 'Error') {
        if ('+*/^'.includes(val)) return '0' + val;
        return val;
      }
      return prev + val;
    });
  };

  const clear = () => setDisplay('0');

  const backspace = () => {
    setDisplay(prev => {
      if (prev.length <= 1 || prev === 'Error') return '0';
      return prev.slice(0, -1);
    });
  };

  const calculate = () => {
    setDisplay(prev => {
      try {
        const expr = prev
          .replace(/π/g, 'Math.PI')
          .replace(/e/g, 'Math.E')
          .replace(/sin\(/g, 'Math.sin(')
          .replace(/cos\(/g, 'Math.cos(')
          .replace(/tan\(/g, 'Math.tan(')
          .replace(/log\(/g, 'Math.log10(')
          .replace(/ln\(/g, 'Math.log(')
          .replace(/sqrt\(/g, 'Math.sqrt(')
          .replace(/\^/g, '**');
        
        const res = new Function(`return ${expr}`)();
        return Number.isFinite(res) ? String(res) : 'Error';
      } catch (e) {
        return 'Error';
      }
    });
  };

  // Keyboard capture with active key press highlights
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      const key = e.key;
      let matchedVal = '';

      if (/[0-9]/.test(key)) {
        matchedVal = key;
        press(key);
      } else if (['+', '-', '*', '/', '.', '(', ')', '^', '−'].includes(key) || e.code === 'Minus' || e.code === 'NumpadSubtract') {
        const actualKey = (key === '-' || key === '−' || e.code === 'Minus' || e.code === 'NumpadSubtract') ? '-' : key;
        matchedVal = actualKey;
        press(actualKey);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        matchedVal = '=';
        calculate();
      } else if (key === 'Backspace') {
        matchedVal = '⌫';
        backspace();
      } else if (key === 'Escape' || key.toLowerCase() === 'c') {
        matchedVal = 'AC';
        clear();
      }

      if (matchedVal) {
        setActivePressedKey(matchedVal);
        const timer = setTimeout(() => {
          setActivePressedKey(null);
        }, 120);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const btns = [
    ['sin(', 'cos(', 'tan(', '(', ')'],
    ['log(', 'ln(', 'sqrt(', '^', '/'],
    ['7', '8', '9', '*', 'π'],
    ['4', '5', '6', '-', 'e'],
    ['1', '2', '3', '+', 'AC'],
    ['0', '.', '⌫', '=', '']
  ];

  return (
    <div style={{ maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Horizontal scroll display preventing text overflow bounds escape */}
      <div 
        className="input-field" 
        style={{ 
          height: '50px', 
          fontSize: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'flex-end', 
          fontFamily: 'var(--font-mono)',
          padding: '0 12px',
          background: 'rgba(0,0,0,0.3)',
          textAlign: 'right',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {display}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
        {btns.flatMap((row, r) => 
          row.map((val, c) => {
            if (val === '') return null;
            let handler = () => { press(val); sounds.playClick(); };
            if (val === 'AC') handler = () => { clear(); sounds.playClick(); };
            else if (val === '⌫') handler = () => { backspace(); sounds.playClick(); };
            else if (val === '=') handler = () => { calculate(); sounds.playSuccess(); };

            const isPressed = val === activePressedKey;

            return (
              <button 
                key={`${r}-${c}`} 
                className="btn" 
                style={{ 
                  padding: '12px 0', 
                  fontSize: '13px',
                  background: isPressed 
                    ? 'var(--accent-color)' 
                    : val === '=' 
                      ? 'var(--accent-gradient)' 
                      : 'rgba(255,255,255,0.05)',
                  border: isPressed ? '1px solid #fff' : '1px solid var(--glass-border)',
                  color: isPressed || val === '=' ? '#fff' : 'inherit',
                  transform: isPressed ? 'scale(0.95)' : 'scale(1)',
                  boxShadow: isPressed ? '0 0 12px var(--accent-color)' : 'none',
                  transition: 'all 0.1s cubic-bezier(0.16, 1, 0.3, 1)'
                }} 
                onClick={handler}
              >
                {val}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

/* --- 2. PROGRAMMER CALCULATOR --- */
const ProgrammerCalc: React.FC = () => {
  const [val, setVal] = useState<string>('0');
  const [base, setBase] = useState<'DEC' | 'HEX' | 'OCT' | 'BIN'>('DEC');

  const parsedDec = (() => {
    try {
      if (base === 'DEC') return parseInt(val, 10) || 0;
      if (base === 'HEX') return parseInt(val, 16) || 0;
      if (base === 'OCT') return parseInt(val, 8) || 0;
      return parseInt(val, 2) || 0;
    } catch {
      return 0;
    }
  })();

  const hexVal = parsedDec.toString(16).toUpperCase();
  const decVal = parsedDec.toString(10);
  const octVal = parsedDec.toString(8);
  const binVal = parsedDec.toString(2);

  // Restricts inputs strictly to numbers and valid radix characters to filter alphabets
  const filterRadixInput = (text: string, currentBase: 'DEC' | 'HEX' | 'OCT' | 'BIN') => {
    const clean = text.toUpperCase();
    if (currentBase === 'BIN') return clean.replace(/[^01]/g, '');
    if (currentBase === 'OCT') return clean.replace(/[^0-7]/g, '');
    if (currentBase === 'DEC') return clean.replace(/[^0-9]/g, '');
    return clean.replace(/[^0-9A-F]/g, ''); // HEX
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Radix displays */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
        <div 
          style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: base === 'HEX' ? 'rgba(var(--accent-color-rgb), 0.15)' : 'transparent', borderRadius: '4px', cursor: 'pointer' }}
          onClick={() => { setBase('HEX'); setVal(hexVal); sounds.playClick(); }}
        >
          <span>HEX</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{hexVal}</span>
        </div>
        <div 
          style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: base === 'DEC' ? 'rgba(var(--accent-color-rgb), 0.15)' : 'transparent', borderRadius: '4px', cursor: 'pointer' }}
          onClick={() => { setBase('DEC'); setVal(decVal); sounds.playClick(); }}
        >
          <span>DEC</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{decVal}</span>
        </div>
        <div 
          style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: base === 'OCT' ? 'rgba(var(--accent-color-rgb), 0.15)' : 'transparent', borderRadius: '4px', cursor: 'pointer' }}
          onClick={() => { setBase('OCT'); setVal(octVal); sounds.playClick(); }}
        >
          <span>OCT</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{octVal}</span>
        </div>
        <div 
          style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: base === 'BIN' ? 'rgba(var(--accent-color-rgb), 0.15)' : 'transparent', borderRadius: '4px', cursor: 'pointer' }}
          onClick={() => { setBase('BIN'); setVal(binVal); sounds.playClick(); }}
        >
          <span>BIN</span>
          <span style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{binVal}</span>
        </div>
      </div>

      {/* Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Input Radix Value ({base})</label>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Letters filtered automatically</span>
        </div>
        <input
          type="text"
          className="input-field"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '16px' }}
          value={val}
          onChange={(e) => setVal(filterRadixInput(e.target.value, base))}
        />
      </div>

      {/* Bitwise operations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <button className="btn" onClick={() => { setVal((parsedDec & 0xFFFF).toString(base === 'HEX' ? 16 : base === 'OCT' ? 8 : base === 'BIN' ? 2 : 10).toUpperCase()); sounds.playClick(); }}>& AND (16-bit)</button>
        <button className="btn" onClick={() => { setVal((parsedDec | 0xFFFF).toString(base === 'HEX' ? 16 : base === 'OCT' ? 8 : base === 'BIN' ? 2 : 10).toUpperCase()); sounds.playClick(); }}>| OR (16-bit)</button>
        <button className="btn" onClick={() => { setVal((~parsedDec & 0xFFFF).toString(base === 'HEX' ? 16 : base === 'OCT' ? 8 : base === 'BIN' ? 2 : 10).toUpperCase()); sounds.playClick(); }}>~ NOT (16-bit)</button>
      </div>

    </div>
  );
};

/* --- 3. MATRIX CALCULATOR --- */
const MatrixCalc: React.FC = () => {
  const [size, setSize] = useState<2 | 3>(2);
  const [m1, setM1] = useState<number[][]>([[1, 2], [3, 4]]);
  const [detResult, setDetResult] = useState<number | null>(null);

  useEffect(() => {
    if (size === 2) {
      setM1([[1, 2], [3, 4]]);
    } else {
      setM1([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    }
    setDetResult(null);
  }, [size]);

  const handleCellChange = (r: number, c: number, val: string) => {
    const num = parseFloat(val) || 0;
    const updated = m1.map((row, rowIndex) => 
      row.map((cell, colIndex) => rowIndex === r && colIndex === c ? num : cell)
    );
    setM1(updated);
  };

  const getDeterminant = () => {
    if (size === 2) {
      const det = m1[0][0] * m1[1][1] - m1[0][1] * m1[1][0];
      setDetResult(det);
    } else {
      const a = m1[0][0], b = m1[0][1], c = m1[0][2];
      const d = m1[1][0], e = m1[1][1], f = m1[1][2];
      const g = m1[2][0], h = m1[2][1], i = m1[2][2];
      const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
      setDetResult(det);
    }
    sounds.playSuccess();
  };

  const getTranspose = () => {
    if (size === 2) {
      const trans = [
        [m1[0][0], m1[1][0]],
        [m1[0][1], m1[1][1]]
      ];
      setM1(trans);
    } else {
      const trans = [
        [m1[0][0], m1[1][0], m1[2][0]],
        [m1[0][1], m1[1][1], m1[2][1]],
        [m1[0][2], m1[1][2], m1[2][2]]
      ];
      setM1(trans);
    }
    setDetResult(null);
    sounds.playClick();
  };

  return (
    <div style={{ maxWidth: size === 2 ? '320px' : '380px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Matrix Dimensions</h4>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            className="btn" 
            style={{ padding: '2px 8px', fontSize: '11px', background: size === 2 ? 'rgba(var(--accent-color-rgb), 0.2)' : 'transparent', borderColor: size === 2 ? 'var(--accent-color)' : 'var(--glass-border)' }}
            onClick={() => { setSize(2); sounds.playClick(); }}
          >
            2 x 2
          </button>
          <button 
            className="btn" 
            style={{ padding: '2px 8px', fontSize: '11px', background: size === 3 ? 'rgba(var(--accent-color-rgb), 0.2)' : 'transparent', borderColor: size === 3 ? 'var(--accent-color)' : 'var(--glass-border)' }}
            onClick={() => { setSize(3); sounds.playClick(); }}
          >
            3 x 3
          </button>
        </div>
      </div>

      {/* Grid inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, 1fr)`, gap: '10px' }}>
        {m1.map((row, r) => 
          row.map((cell, c) => (
            <input
              key={`${r}-${c}`}
              type="number"
              className="input-field"
              style={{ textAlign: 'center', fontSize: '15px', fontFamily: 'var(--font-mono)', padding: '6px' }}
              value={cell}
              onChange={(e) => handleCellChange(r, c, e.target.value)}
            />
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={getDeterminant}>Calculate Det</button>
        <button className="btn" style={{ flex: 1 }} onClick={getTranspose}>Transpose</button>
      </div>

      {detResult !== null && (
        <div className="glass-panel" style={{ textAlign: 'center', fontSize: '14px' }}>
          Determinant |A| = <strong>{detResult}</strong>
        </div>
      )}
    </div>
  );
};

/* --- 4. STATISTICS CALCULATOR --- */
const StatisticsCalc: React.FC = () => {
  const [dataInput, setDataInput] = useState('10, 20, 15, 30, 25, 40');
  const [stats, setStats] = useState<{ mean: number; median: number; stdDev: number; variance: number } | null>(null);

  const calculateStats = () => {
    const list = dataInput.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (list.length === 0) return;

    // Mean
    const mean = list.reduce((a, b) => a + b, 0) / list.length;

    // Median
    const sorted = [...list].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    // Variance & StdDev
    const sqDiffs = list.map(n => Math.pow(n - mean, 2));
    const variance = sqDiffs.reduce((a, b) => a + b, 0) / list.length;
    const stdDev = Math.sqrt(variance);

    setStats({
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100
    });
    sounds.playSuccess();
  };

  return (
    <div style={{ maxWidth: '380px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Input numbers list (comma separated)</label>
        <textarea
          className="textarea-field"
          value={dataInput}
          onChange={(e) => setDataInput(e.target.value)}
          rows={3}
        />
      </div>

      <button className="btn btn-primary" onClick={calculateStats}>Analyze List</button>

      {stats && (
        <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
          <div>Mean: <strong>{stats.mean}</strong></div>
          <div>Median: <strong>{stats.median}</strong></div>
          <div>Variance: <strong>{stats.variance}</strong></div>
          <div>Std Deviation: <strong>{stats.stdDev}</strong></div>
        </div>
      )}
    </div>
  );
};

/* --- 5. UNIT CONVERTER --- */
const UnitCalc: React.FC = () => {
  const [val, setVal] = useState(1);
  const [category, setCategory] = useState<'length' | 'weight' | 'bytes'>('length');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('km');
  const [result, setResult] = useState<number | null>(null);

  const conversions: { [key: string]: { [unit: string]: number } } = {
    length: { m: 1, km: 1000, cm: 0.01, inch: 0.0254, ft: 0.3048 },
    weight: { kg: 1, g: 0.001, lb: 0.453592, oz: 0.0283495 },
    bytes: { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 }
  };

  const handleConvert = () => {
    const catConvs = conversions[category];
    const valInBase = val * catConvs[fromUnit];
    const converted = valInBase / catConvs[toUnit];
    setResult(Math.round(converted * 100000) / 100000);
    sounds.playSuccess();
  };

  const units = Object.keys(conversions[category]);

  return (
    <div style={{ maxWidth: '380px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Category</label>
        <select 
          className="select-field" 
          value={category} 
          onChange={(e) => {
            const cat = e.target.value as any;
            setCategory(cat);
            const list = Object.keys(conversions[cat]);
            setFromUnit(list[0]);
            setToUnit(list[1] || list[0]);
            setResult(null);
            sounds.playClick();
          }}
        >
          <option value="length" style={{ background: '#000' }}>Length / Distance</option>
          <option value="weight" style={{ background: '#000' }}>Weight / Mass</option>
          <option value="bytes" style={{ background: '#000' }}>Data Bytes</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', alignItems: 'end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Value</label>
          <input
            type="number"
            className="input-field"
            value={val}
            onChange={(e) => setVal(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>From Unit</label>
          <select className="select-field" value={fromUnit} onChange={(e) => { setFromUnit(e.target.value); sounds.playClick(); }}>
            {units.map(u => <option key={u} value={u} style={{ background: '#000' }}>{u}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>To Unit</label>
          <select className="select-field" value={toUnit} onChange={(e) => { setToUnit(e.target.value); sounds.playClick(); }}>
            {units.map(u => <option key={u} value={u} style={{ background: '#000' }}>{u}</option>)}
          </select>
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleConvert}>Convert Units</button>

      {result !== null && (
        <div className="glass-panel" style={{ textAlign: 'center', fontSize: '15px' }}>
          {val} {fromUnit} = <strong>{result} {toUnit}</strong>
        </div>
      )}
    </div>
  );
};

/* --- 6. CGPA/SGPA GRADE CALCULATOR --- */
const GPACalc: React.FC = () => {
  const [courses, setCourses] = useState<{ id: string; grade: string; credits: number }[]>([
    { id: '1', grade: 'S', credits: 4 },
    { id: '2', grade: 'A', credits: 3 }
  ]);
  const [showResult, setShowResult] = useState<number | null>(null);

  const gradePoints: { [key: string]: number } = {
    'S': 10, 'A': 9, 'B': 8, 'C': 7, 'D': 6, 'E': 5, 'F': 0
  };

  const handleAddCourse = () => {
    setCourses([...courses, { id: crypto.randomUUID(), grade: 'A', credits: 3 }]);
    sounds.playClick();
  };

  const handleRemoveCourse = (id: string) => {
    setCourses(courses.filter(c => c.id !== id));
    sounds.playClick();
  };

  const handleCourseChange = (id: string, key: 'grade' | 'credits', val: string) => {
    setCourses(courses.map(c => 
      c.id === id ? { ...c, [key]: key === 'credits' ? parseInt(val) || 0 : val } : c
    ));
  };

  const calculateGPA = () => {
    let totalCredits = 0;
    let weightedPoints = 0;

    courses.forEach(c => {
      const points = gradePoints[c.grade] ?? 0;
      weightedPoints += points * c.credits;
      totalCredits += c.credits;
    });

    const gpa = totalCredits > 0 ? weightedPoints / totalCredits : 0;
    setShowResult(Math.round(gpa * 100) / 100);
    sounds.playSuccess();
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Semestrial SGPA Calculator</h4>
        <button className="btn" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={handleAddCourse}>➕ Add Course</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {courses.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              className="select-field"
              value={c.grade}
              onChange={(e) => handleCourseChange(c.id, 'grade', e.target.value)}
              style={{ flex: 2 }}
            >
              <option value="S" style={{ background: '#000' }}>Grade S (10 Points)</option>
              <option value="A" style={{ background: '#000' }}>Grade A (9 Points)</option>
              <option value="B" style={{ background: '#000' }}>Grade B (8 Points)</option>
              <option value="C" style={{ background: '#000' }}>Grade C (7 Points)</option>
              <option value="D" style={{ background: '#000' }}>Grade D (6 Points)</option>
              <option value="E" style={{ background: '#000' }}>Grade E (5 Points)</option>
              <option value="F" style={{ background: '#000' }}>Grade F (0 Points)</option>
            </select>
            
            <input
              type="number"
              className="input-field"
              placeholder="Credits"
              value={c.credits}
              onChange={(e) => handleCourseChange(c.id, 'credits', e.target.value)}
              style={{ flex: 1, textAlign: 'center' }}
            />

            <button className="btn" style={{ color: 'var(--error)' }} onClick={() => handleRemoveCourse(c.id)}>×</button>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={calculateGPA}>Calculate GPA</button>

      {showResult !== null && (
        <div className="glass-panel" style={{ textAlign: 'center', fontSize: '16px' }}>
          Calculated GPA Index: <strong>{showResult} / 10.0</strong>
        </div>
      )}
    </div>
  );
};
