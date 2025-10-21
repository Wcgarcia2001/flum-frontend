// src/App.jsx
import React, { useState } from 'react';
import ReactMapGL, { Marker } from 'react-map-gl';
import { Button, Box, Typography, Paper, LinearProgress } from '@mui/material';

// 🔁 Reemplaza con tu URL de Render
const BACKEND_URL = 'https://flum-backend.onrender.com';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoid2lsbGlhbWNhbGRlcm9uIiwiYSI6ImNsMWsyenVvbzBmdmszZHFnaWN3cTlsdnIifQ.FBCDg2lX8qY4t6weqra39w'; // ¡Obligatorio!

export default function App() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [viewport, setViewport] = useState({
    latitude: 4.6,
    longitude: -74.1,
    zoom: 10
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

      setData(result.data);
      setSummary(result);
      const weeks = Object.keys(result.semanas).sort();
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Analizador FLUM (con Backend)
      </Typography>

      <input
        type="file"
        accept=".xlsx"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        id="file-upload"
      />
      <label htmlFor="file-upload">
        <Button variant="contained" component="span" disabled={loading}>
          Cargar archivo Excel (.xlsx)
        </Button>
      </label>

      {loading && <LinearProgress sx={{ mt: 2 }} />}
      {error && <Typography color="error">❌ {error}</Typography>}

      {summary && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6">
            ✅ Procesado: {summary.total_registros} registros | {summary.luminarias_unicas} luminarias únicas
          </Typography>
          {currentWeek && (
            <Typography variant="body1" color="text.secondary">
              Semana: {currentWeek} ({summary.semanas[currentWeek]} luminarias)
            </Typography>
          )}
        </Paper>
      )}

      {data.length > 0 && (
        <Box sx={{ height: '60vh', mt: 2 }}>
          <ReactMapGL
            {...viewport}
            onMove={evt => setViewport(evt.viewState)}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={MAPBOX_TOKEN}
          >
            {data
              .filter(row => row.SemanaEtiqueta === currentWeek)
              .map((row, i) => (
                <Marker
                  key={i}
                  longitude={row.Longitud}
                  latitude={row.Latitud}
                >
                  <div
                    style={{
                      width: Math.max(6, Math.min(20, (row.Watts || 10) / 3)),
                      height: Math.max(6, Math.min(20, (row.Watts || 10) / 3)),
                      backgroundColor: getColorByAngle(row.AnguloFP),
                      borderRadius: '50%',
                      border: '1px solid white'
                    }}
                    title={`${row['Nombre del SLC']} - ${row.Watts}W`}
                  />
                </Marker>
              ))}
          </ReactMapGL>
        </Box>
      )}
    </Box>
  );
}