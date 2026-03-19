import React, { useEffect, useRef, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import * as turf from '@turf/turf';
import useRunStore from '../store/runStore';

maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY;

function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const markerEl = useRef(null);
  const watchId = useRef(null);
  const statsInterval = useRef(null);

  const isRunningRef = useRef(false);
  const gpsPointsRef = useRef([]);
  const startTimeRef = useRef(null);

  const [toastMessage, setToastMessage] = useState('');
  const [gpsStatus, setGpsStatus] = useState('searching');
  const [locationPermission, setLocationPermission] = useState('pending');
  
  const [distanceKm, setDistanceKm] = useState('0.00');
  const [durationStr, setDurationStr] = useState('00:00');
  const [paceStr, setPaceStr] = useState('0:00');
  const [areaStr, setAreaStr] = useState('0 m²');

  const { isRunning, startRun, stopRun, addGpsPoint, setCurrentLocation } = useRunStore();

  useEffect(() => {
    isRunningRef.current = isRunning;
    if (!isRunning) {
      clearInterval(statsInterval.current);
    } else {
      startTimeRef.current = Date.now();
      gpsPointsRef.current = [];
      setDistanceKm('0.00');
      startStatsInterval();
    }
  }, [isRunning]);

  useEffect(() => {
    return () => clearInterval(statsInterval.current);
  }, []);

  const startStatsInterval = () => {
    statsInterval.current = setInterval(() => {
      if (!isRunningRef.current) return;
      
      const now = Date.now();
      const elapsedMs = now - startTimeRef.current;
      const elapsedSec = Math.floor(elapsedMs / 1000);
      
      const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
      const secs = (elapsedSec % 60).toString().padStart(2, '0');
      setDurationStr(`${mins}:${secs}`);

      const points = gpsPointsRef.current;
      
      // Calculate Area (only display if >= 3 points can form a polygon hull)
      if (points.length >= 3) {
        const coords = points.map(p => [p.longitude, p.latitude]);
        const ptFeatures = coords.map(c => turf.point(c));
        const hull = turf.convex(turf.featureCollection(ptFeatures));
        
        if (hull) {
          const areaSqMeters = turf.area(hull);
          if (areaSqMeters >= 1000) {
            setAreaStr(`${(areaSqMeters / 1000000).toFixed(2)} km²`);
          } else {
            setAreaStr(`${Math.floor(areaSqMeters)} m²`);
          }
        }
      } else {
        setAreaStr('0 m²');
      }

      // Calculate Pace
      const dist = parseFloat(distanceKm);
      if (dist > 0 && elapsedSec > 0) {
        const paceMinsPerKm = (elapsedSec / 60) / dist;
        const pMins = Math.floor(paceMinsPerKm);
        const pSecs = Math.floor((paceMinsPerKm - pMins) * 60).toString().padStart(2, '0');
        if (paceMinsPerKm < 60) {
          setPaceStr(`${pMins}:${pSecs}`);
        } else {
          setPaceStr('>60:00');
        }
      } else {
        setPaceStr('0:00');
      }
    }, 1000);
  };

  const handleLocationUpdate = (pos) => {
    const { latitude, longitude, accuracy } = pos.coords;
    if (accuracy > 30) return;

    setGpsStatus('found');
    const newPos = [longitude, latitude];
    
    setCurrentLocation({ lat: latitude, lng: longitude });

    // Problem 1 Fix
    if (marker.current) {
      marker.current.remove();
    }
    if (!markerEl.current) {
      const el = document.createElement('div');
      el.className = 'pulse-dot';
      markerEl.current = el;
    }
    marker.current = new maptilersdk.Marker({ element: markerEl.current })
      .setLngLat(newPos)
      .addTo(map.current);
    
    if (map.current) {
      map.current.flyTo({ center: newPos, zoom: 15 });
    }

    // Problem 2 Fix
    if (isRunningRef.current) {
      const newPoint = { latitude, longitude, timestamp: Date.now(), accuracy };
      const updatedPoints = [...gpsPointsRef.current, newPoint];
      gpsPointsRef.current = updatedPoints;
      addGpsPoint(newPoint);

      let totalDist = 0;
      for (let i = 1; i < updatedPoints.length; i++) {
        const p1 = turf.point([updatedPoints[i-1].longitude, updatedPoints[i-1].latitude]);
        const p2 = turf.point([updatedPoints[i].longitude, updatedPoints[i].latitude]);
        totalDist += turf.distance(p1, p2, { units: 'kilometers' });
      }
      setDistanceKm(totalDist.toFixed(2));

      // Problem 3 Fix
      if (updatedPoints.length >= 3) {
        const points = turf.featureCollection(updatedPoints.map(p => turf.point([p.longitude, p.latitude])));
        // Turf uses convex, but if convexHull is aliased we support it
        const hull = turf.convex ? turf.convex(points) : turf.convexHull(points);

        if (hull) {
          const source = map.current.getSource('territory-source');
          if (source) {
            source.setData(hull);
          } else {
            // Add fresh Source and Layers
            map.current.addSource('territory-source', {
              type: 'geojson',
              data: hull
            });

            map.current.addLayer({
              id: 'territory-fill-layer',
              type: 'fill',
              source: 'territory-source',
              paint: {
                'fill-color': '#39FF14',
                'fill-opacity': 0.35
              }
            });

            map.current.addLayer({
              id: 'territory-polygon-border-layer',
              type: 'line',
              source: 'territory-source',
              paint: {
                'line-color': '#39FF14',
                'line-width': 2,
                'line-opacity': 0.8
              }
            });
          }
        }
      }
    }
  };

  const handleLocationError = (err) => {
    setLocationPermission('denied');
  };

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationPermission('denied');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationPermission('granted');
        const { latitude, longitude } = pos.coords;
        const initialPos = [longitude, latitude];

        map.current = new maptilersdk.Map({
          container: mapContainer.current,
          style: `https://api.maptiler.com/maps/darkmatter/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`,
          center: initialPos,
          zoom: 15,
          attributionControl: false
        });

        // Initialize Marker at boot
        if (marker.current) {
          marker.current.remove();
        }
        if (!markerEl.current) {
          const el = document.createElement('div');
          el.className = 'pulse-dot';
          markerEl.current = el;
        }

        marker.current = new maptilersdk.Marker({ element: markerEl.current })
          .setLngLat(initialPos)
          .addTo(map.current);

        watchId.current = navigator.geolocation.watchPosition(
          handleLocationUpdate,
          handleLocationError,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      },
      (err) => {
        setLocationPermission('denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      if (watchId.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      if (marker.current) {
        marker.current.remove();
        marker.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleRun = () => {
    if (!isRunning) {
      setDistanceKm('0.00');
      setDurationStr('00:00');
      setPaceStr('0:00');
      setAreaStr('0 m²');
      
      const source = map.current.getSource('territory-source');
      if (source) source.setData({ type: 'FeatureCollection', features: [] });
      
      startRun();
    } else {
      const points = gpsPointsRef.current;
      clearInterval(statsInterval.current);

      if (points.length < 3) {
        stopRun(null); 
      } else {
        const coords = points.map(p => [p.longitude, p.latitude]);
        const polygon = turf.convex(turf.featureCollection(coords.map(c => turf.point(c))));
        
        stopRun({
          id: Date.now().toString(),
          gpsPoints: points,
          polygon,
          distance: parseFloat(distanceKm),
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
          area: areaStr,
          startTime: startTimeRef.current,
          endTime: Date.now()
        });
      }
    }
  };

  if (locationPermission === 'denied') {
    return (
      <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: '24px', textAlign: 'center' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="#39FF14" style={{ marginBottom: '24px' }}>
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '16px', letterSpacing: '-0.5px' }}>Location Access Required</h2>
        <p style={{ color: '#aaa', maxWidth: '420px', marginBottom: '32px', lineHeight: '1.6', fontSize: '1.1rem' }}>
          StrideWars needs your location to track your runs. Please enable location access in your browser settings and refresh the page.
        </p>
        <button 
          onClick={() => window.location.reload()}
          style={{ backgroundColor: '#39FF14', color: '#111', padding: '16px 32px', borderRadius: '16px', fontSize: '1.2rem', fontWeight: '800', border: 'none', cursor: 'pointer', boxShadow: '0 0 25px rgba(57,255,20,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#0a0a0a', overflow: 'hidden' }}>
      
      {/* Map is only visible after location is granted */}
      <div 
        ref={mapContainer} 
        style={{ width: '100%', height: '100%', opacity: locationPermission === 'granted' ? 1 : 0, pointerEvents: locationPermission === 'granted' ? 'auto' : 'none' }} 
      />

      {toastMessage && locationPermission === 'granted' && (
        <div className="toast">
          {toastMessage}
        </div>
      )}

      {locationPermission === 'granted' && (
        <div className="bottom-panel">
          <div className="drag-handle-container">
            <div className="drag-handle"></div>
          </div>

          <div className="panel-header">
            <div className="territory-info">
              <h1 className="territory-value">{areaStr}</h1>
              <p className="territory-label">Capture in Progress</p>
            </div>
            <div className="gps-indicator" title="GPS Status">
              {gpsStatus === 'found' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#39FF14">
                  <rect x="4" y="14" width="4" height="6" rx="1" />
                  <rect x="10" y="10" width="4" height="10" rx="1" />
                  <rect x="16" y="6" width="4" height="14" rx="1" />
                </svg>
              ) : gpsStatus === 'searching' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#888">
                  <rect x="4" y="14" width="4" height="6" rx="1" />
                  <rect x="10" y="10" width="4" height="10" rx="1" opacity="0.5" />
                  <rect x="16" y="6" width="4" height="14" rx="1" opacity="0.5" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#E24A4A">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              )}
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-value">{distanceKm}</span>
              <span className="stat-label">Distance (km)</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{durationStr}</span>
              <span className="stat-label">Duration</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{paceStr}</span>
              <span className="stat-label">Avg Pace</span>
            </div>
          </div>

          <button 
            className={`start-run-btn ${isRunning ? 'stop-run-btn' : ''}`}
            onClick={handleToggleRun}
          >
            {isRunning ? 'Stop Run' : 'Start Run'}
          </button>
        </div>
      )}
    </div>
  );
}

export default Map;