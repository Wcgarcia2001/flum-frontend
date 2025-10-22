import React, { useState } from 'react';

const BACKEND_URL = 'https://flum-backend.onrender.com';

export default function App() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);

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
    setDebugInfo({ status: 'Iniciando carga...', step: 1 });

    try {
      setDebugInfo({ status: 'Enviando archivo al servidor...', step: 2 });
      
      const res = await fetch(`${BACKEND_URL}/process-flum`, {
        method: 'POST',
        body: formData
      });

      setDebugInfo({ status: 'Procesando respuesta del servidor...', step: 3 });

      const result = await res.json();

      setDebugInfo({ 
        status: 'Respuesta recibida', 
        step: 4, 
        response: {
          ok: res.ok,
          status: res.status,
          dataLength: result.data?.length,
          keys: Object.keys(result)
        }
      });

      if (!res.ok) {
        throw new Error(result.detail || 'Error desconocido');
      }

      // Validar que la respuesta tenga la estructura esperada
      if (!result.data || !Array.isArray(result.data)) {
        throw new Error('Respuesta inválida del servidor: falta campo "data"');
      }

      setData(result.data);
      setSummary(result);
      
      const weeks = Object.keys(result.semanas || {}).sort();
      setAvailableWeeks(weeks);
      setCurrentWeek(weeks[0] || null);

      setDebugInfo({ status: '✅ Carga completada', step: 5, success: true });
      
      // Limpiar debug info después de 3 segundos
      setTimeout(() => setDebugInfo(null), 3000);
      
    } catch (err) {
      console.error('Error completo:', err);
      setError(err.message);
      setDebugInfo({ 
        status: '❌ Error', 
        step: 'error', 
        error: err.message,
        errorType: err.name 
      });
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

  const filteredData = currentWeek 
    ? data.filter(row => row.SemanaEtiqueta === currentWeek)
    : data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-800/50 backdrop-blur rounded-2xl shadow-2xl p-8 mb-6">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Analizador FLUM
          </h1>
          <p className="text-gray-400">Procesamiento de luminarias con backend</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 mb-6">
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            disabled={loading}
          />
          <label htmlFor="file-upload">
            <span className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold cursor-pointer transition-all transform ${
              loading 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:scale-105 shadow-lg hover:shadow-xl'
            }`}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Procesando...
                </>
              ) : (
                <>
                  📂 Cargar archivo Excel (.xlsx)
                </>
              )}
            </span>
          </label>
        </div>

        {debugInfo && (
          <div className={`rounded-xl p-4 mb-6 border ${
            debugInfo.success 
              ? 'bg-green-900/30 border-green-500/50' 
              : debugInfo.error 
              ? 'bg-red-900/30 border-red-500/50'
              : 'bg-blue-900/30 border-blue-500/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${loading ? 'animate-pulse bg-blue-400' : 'bg-green-400'}`}></div>
              <span className="font-semibold">{debugInfo.status}</span>
            </div>
            {debugInfo.response && (
              <pre className="text-xs bg-gray-900/50 rounded p-2 mt-2 overflow-x-auto">
                {JSON.stringify(debugInfo.response, null, 2)}
              </pre>
            )}
          </div>
        )}

        {loading && (
          <div className="w-full bg-gray-700 rounded-full h-2 mb-6 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 animate-pulse w-full"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-6 py-4 rounded-xl mb-6 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-2xl">❌</span>
              <div>
                <div className="font-semibold">Error al procesar archivo</div>
                <div className="text-sm mt-1">{error}</div>
              </div>
            </div>
          </div>
        )}

        {summary && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 mb-6 shadow-xl border border-gray-600">
            <div className="flex items-start gap-4">
              <div className="text-4xl">✅</div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-2">
                  Procesamiento Exitoso
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-gray-400 text-sm">Total Registros</div>
                    <div className="text-2xl font-bold text-blue-400">{summary.total_registros}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-gray-400 text-sm">Luminarias Únicas</div>
                    <div className="text-2xl font-bold text-purple-400">{summary.luminarias_unicas}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-gray-400 text-sm">Semanas</div>
                    <div className="text-2xl font-bold text-green-400">{availableWeeks.length}</div>
                  </div>
                </div>
                
                {currentWeek && (
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <p className="text-gray-300">
                      <span className="font-semibold">Semana actual:</span> {currentWeek} 
                      <span className="text-gray-400 ml-2">({summary.semanas[currentWeek]} luminarias)</span>
                    </p>
                  </div>
                )}
                
                {availableWeeks.length > 1 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Seleccionar semana:
                    </label>
                    <select
                      value={currentWeek}
                      onChange={(e) => setCurrentWeek(e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
                    >
                      {availableWeeks.map(week => (
                        <option key={week} value={week}>
                          {week} ({summary.semanas[week]} luminarias)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {filteredData.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 shadow-xl">
            <h3 className="text-2xl font-semibold mb-4">
              📊 Luminarias - {currentWeek} 
              <span className="text-gray-400 text-lg ml-2">({filteredData.length} registros)</span>
            </h3>
            
            <div className="mb-6 flex flex-wrap gap-4 text-sm bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: '#FA0580' }}></div>
                <span>&gt;80° - 90°</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: '#FA0505' }}></div>
                <span>&gt;60° - 80°</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: '#FA8005' }}></div>
                <span>&gt;40° - 60°</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-500 shadow-lg"></div>
                <span>Otros</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-gradient-to-r from-gray-700 to-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nombre SLC</th>
                    <th className="px-4 py-3 font-semibold">Latitud</th>
                    <th className="px-4 py-3 font-semibold">Longitud</th>
                    <th className="px-4 py-3 font-semibold">Watts</th>
                    <th className="px-4 py-3 font-semibold">Ángulo FP</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, 100).map((row, i) => (
                    <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{row['Nombre del SLC']}</td>
                      <td className="px-4 py-3 text-gray-300">{row.Latitud?.toFixed(6)}</td>
                      <td className="px-4 py-3 text-gray-300">{row.Longitud?.toFixed(6)}</td>
                      <td className="px-4 py-3 text-blue-400 font-semibold">{row.Watts}W</td>
                      <td className="px-4 py-3 text-gray-300">{row.AnguloFP || 'N/A'}</td>
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
                <div className="bg-gray-700/50 text-gray-300 text-center py-4 border-t border-gray-700">
                  Mostrando 100 de {filteredData.length} registros
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && !summary && !error && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-lg">Carga un archivo Excel (.xlsx) para comenzar</p>
          </div>
        )}
      </div>
    </div>
  );
}