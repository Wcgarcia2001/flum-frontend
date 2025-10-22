import React, { useState, useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BACKEND_URL = 'https://flum-backend.onrender.com';

const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444'];

export default function App() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('dashboard');
  const [filters, setFilters] = useState({
    minWatts: '',
    maxWatts: '',
    angulo: 'all'
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      alert('Solo se permiten archivos .xlsx');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/process-flum`, {
        method: 'POST',
        body: formData
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.detail || 'Error desconocido');
      }

      if (!result.data || !Array.isArray(result.data)) {
        throw new Error('Respuesta inválida del servidor');
      }

      setData(result.data);
      setSummary(result);
      
      const weeks = Object.keys(result.semanas || {}).sort();
      setAvailableWeeks(weeks);
      setCurrentWeek(weeks[0] || null);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getColorByAngle = (angle) => {
    if (!angle) return '#888';
    if (angle.includes('>80° - 90°')) return '#FA0580';
    if (angle.includes('>60° - 80°')) return '#FA0505';
    if (angle.includes('>40° - 60°')) return '#FA8005';
    return '#888';
  };

  const filteredData = useMemo(() => {
    let result = currentWeek 
      ? data.filter(row => row.SemanaEtiqueta === currentWeek)
      : data;

    // Filtros de watts
    if (filters.minWatts) {
      result = result.filter(row => row.Watts >= parseFloat(filters.minWatts));
    }
    if (filters.maxWatts) {
      result = result.filter(row => row.Watts <= parseFloat(filters.maxWatts));
    }

    // Filtro de ángulo
    if (filters.angulo !== 'all') {
      result = result.filter(row => row.AnguloFP?.includes(filters.angulo));
    }

    // Búsqueda
    if (searchTerm) {
      result = result.filter(row => 
        row['Nombre del SLC']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row['ID del SLC']?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [data, currentWeek, filters, searchTerm]);

  // Estadísticas calculadas
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;

    const watts = filteredData.map(r => r.Watts).filter(w => w > 0);
    const avgWatts = watts.reduce((a, b) => a + b, 0) / watts.length;
    const maxWatts = Math.max(...watts);
    const minWatts = Math.min(...watts);
    
    // Distribución por ángulo
    const anguloCount = {};
    filteredData.forEach(row => {
      const ang = row.AnguloFP || 'Sin ángulo';
      anguloCount[ang] = (anguloCount[ang] || 0) + 1;
    });

    // Distribución por rangos de watts
    const wattsRanges = {
      '0-50W': 0,
      '51-100W': 0,
      '101-150W': 0,
      '151-200W': 0,
      '201-250W': 0,
      '>250W': 0
    };

    filteredData.forEach(row => {
      const w = row.Watts;
      if (w <= 50) wattsRanges['0-50W']++;
      else if (w <= 100) wattsRanges['51-100W']++;
      else if (w <= 150) wattsRanges['101-150W']++;
      else if (w <= 200) wattsRanges['151-200W']++;
      else if (w <= 250) wattsRanges['201-250W']++;
      else wattsRanges['>250W']++;
    });

    return {
      avgWatts: avgWatts.toFixed(2),
      maxWatts,
      minWatts,
      totalWatts: watts.reduce((a, b) => a + b, 0).toFixed(2),
      anguloDistribution: Object.entries(anguloCount).map(([name, value]) => ({ name, value })),
      wattsDistribution: Object.entries(wattsRanges).map(([name, value]) => ({ name, value }))
    };
  }, [filteredData]);

  // Datos para gráfico de línea (evolución semanal)
  const weeklyData = useMemo(() => {
    if (!summary) return [];
    return availableWeeks.map(week => ({
      semana: week,
      luminarias: summary.semanas[week]
    }));
  }, [summary, availableWeeks]);

  const exportData = () => {
    const csv = [
      ['ID SLC', 'Nombre SLC', 'Latitud', 'Longitud', 'Watts', 'Ángulo FP', 'Semana'].join(','),
      ...filteredData.map(row => [
        row['ID del SLC'],
        row['Nombre del SLC'],
        row.Latitud,
        row.Longitud,
        row.Watts,
        row.AnguloFP,
        row.SemanaEtiqueta
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flum-export-${currentWeek || 'all'}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                🔆 Dashboard FLUM
              </h1>
              <p className="text-slate-400 text-sm mt-1">Sistema de análisis de luminarias</p>
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={loading}
              />
              <label htmlFor="file-upload">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold cursor-pointer transition-all ${
                  loading 
                    ? 'bg-slate-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg'
                }`}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      📂 Cargar Excel
                    </>
                  )}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {loading && (
          <div className="w-full bg-slate-700 rounded-full h-2 mb-6 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 animate-pulse w-full"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-6 py-4 rounded-xl mb-6">
            ❌ {error}
          </div>
        )}

        {summary && (
          <>
            {/* Navigation Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
              {['dashboard', 'tabla', 'mapa'].map(view => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    activeView === view
                      ? 'bg-blue-600 shadow-lg'
                      : 'bg-slate-700/50 hover:bg-slate-700'
                  }`}
                >
                  {view === 'dashboard' && '📊 Dashboard'}
                  {view === 'tabla' && '📋 Tabla de Datos'}
                  {view === 'mapa' && '🗺️ Vista de Mapa'}
                </button>
              ))}
            </div>

            {/* Filters Bar */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 mb-6 border border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Semana</label>
                  <select
                    value={currentWeek}
                    onChange={(e) => setCurrentWeek(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableWeeks.map(week => (
                      <option key={week} value={week}>
                        {week}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Watts mín</label>
                  <input
                    type="number"
                    value={filters.minWatts}
                    onChange={(e) => setFilters({...filters, minWatts: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Watts máx</label>
                  <input
                    type="number"
                    value={filters.maxWatts}
                    onChange={(e) => setFilters({...filters, maxWatts: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="∞"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Ángulo FP</label>
                  <select
                    value={filters.angulo}
                    onChange={(e) => setFilters({...filters, angulo: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos</option>
                    <option value=">80° - 90°">&gt;80° - 90°</option>
                    <option value=">60° - 80°">&gt;60° - 80°</option>
                    <option value=">40° - 60°">&gt;40° - 60°</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Buscar</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre o ID..."
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-slate-400">
                  Mostrando {filteredData.length} de {data.length} registros
                </div>
                <button
                  onClick={exportData}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  📥 Exportar CSV
                </button>
              </div>
            </div>

            {/* Dashboard View */}
            {activeView === 'dashboard' && stats && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 shadow-lg">
                    <div className="text-blue-200 text-sm mb-1">Total Luminarias</div>
                    <div className="text-3xl font-bold">{filteredData.length}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 shadow-lg">
                    <div className="text-purple-200 text-sm mb-1">Watts Promedio</div>
                    <div className="text-3xl font-bold">{stats.avgWatts}W</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-4 shadow-lg">
                    <div className="text-green-200 text-sm mb-1">Total Watts</div>
                    <div className="text-3xl font-bold">{(stats.totalWatts / 1000).toFixed(1)}kW</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-4 shadow-lg">
                    <div className="text-orange-200 text-sm mb-1">Watts Máximo</div>
                    <div className="text-3xl font-bold">{stats.maxWatts}W</div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-600 to-pink-700 rounded-xl p-4 shadow-lg">
                    <div className="text-pink-200 text-sm mb-1">Watts Mínimo</div>
                    <div className="text-3xl font-bold">{stats.minWatts}W</div>
                  </div>
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Distribución por Ángulo */}
                  <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
                    <h3 className="text-xl font-semibold mb-4">📐 Distribución por Ángulo FP</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.anguloDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {stats.anguloDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Distribución por Watts */}
                  <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
                    <h3 className="text-xl font-semibold mb-4">⚡ Distribución por Potencia</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.wattsDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                        />
                        <Bar dataKey="value" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Charts Row 2 */}
                <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
                  <h3 className="text-xl font-semibold mb-4">📈 Evolución Semanal de Luminarias</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="semana" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="luminarias" 
                        stroke="#8B5CF6" 
                        strokeWidth={2}
                        dot={{ fill: '#8B5CF6', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Table View */}
            {activeView === 'tabla' && (
              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
                <h3 className="text-2xl font-semibold mb-4">
                  📋 Tabla de Luminarias
                </h3>
                
                <div className="overflow-x-auto rounded-lg border border-slate-700">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="px-4 py-3">ID SLC</th>
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3">Latitud</th>
                        <th className="px-4 py-3">Longitud</th>
                        <th className="px-4 py-3">Watts</th>
                        <th className="px-4 py-3">Ángulo FP</th>
                        <th className="px-4 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.slice(0, 100).map((row, i) => (
                        <tr key={i} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="px-4 py-3 font-mono text-xs">{row['ID del SLC']}</td>
                          <td className="px-4 py-3">{row['Nombre del SLC']}</td>
                          <td className="px-4 py-3">{row.Latitud?.toFixed(6)}</td>
                          <td className="px-4 py-3">{row.Longitud?.toFixed(6)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-blue-600 rounded text-xs font-semibold">
                              {row.Watts}W
                            </span>
                          </td>
                          <td className="px-4 py-3">{row.AnguloFP || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <div 
                              className="w-6 h-6 rounded-full border-2 border-white shadow-lg"
                              style={{ backgroundColor: getColorByAngle(row.AnguloFP) }}
                              title={row.AnguloFP || 'Sin ángulo'}
                            ></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredData.length > 100 && (
                    <div className="bg-slate-700/50 text-slate-300 text-center py-4">
                      Mostrando 100 de {filteredData.length} registros
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Map View */}
            {activeView === 'mapa' && (
              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
                <h3 className="text-2xl font-semibold mb-4">🗺️ Vista de Coordenadas</h3>
                
                <div className="mb-4 flex gap-4 text-sm bg-slate-900/50 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#FA0580' }}></div>
                    <span>&gt;80° - 90°</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#FA0505' }}></div>
                    <span>&gt;60° - 80°</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#FA8005' }}></div>
                    <span>&gt;40° - 60°</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                  {filteredData.slice(0, 50).map((row, i) => (
                    <div key={i} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-4 h-4 rounded-full border border-white"
                          style={{ backgroundColor: getColorByAngle(row.AnguloFP) }}
                        ></div>
                        <span className="font-semibold text-sm truncate">{row['Nombre del SLC']}</span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div>📍 {row.Latitud?.toFixed(4)}, {row.Longitud?.toFixed(4)}</div>
                        <div>⚡ {row.Watts}W</div>
                        <div>📐 {row.AnguloFP || 'N/A'}</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredData.length > 50 && (
                  <div className="text-center text-slate-400 mt-4">
                    Mostrando 50 de {filteredData.length} luminarias
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!loading && !summary && !error && (
          <div className="text-center py-20">
            <div className="text-8xl mb-6">📊</div>
            <h2 className="text-3xl font-bold mb-2">Bienvenido al Dashboard FLUM</h2>
            <p className="text-slate-400 text-lg mb-6">
              Carga un archivo Excel para comenzar el análisis de luminarias
            </p>
            <div className="flex justify-center gap-4 text-sm text-slate-500">
              <div>✓ Análisis estadístico completo</div>
              <div>✓ Visualización de datos</div>
              <div>✓ Exportación a CSV</div>
              <div>✓ Filtros avanzados</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}