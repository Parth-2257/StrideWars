import React, { useEffect, useRef } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'

maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY

// Temporary: hardcoded to Indore, change later
const DEFAULT_LAT = 22.7196
const DEFAULT_LNG = 75.8577

function Map() {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (map.current) return

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/darkmatter/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`,
      center: [DEFAULT_LNG, DEFAULT_LAT],
      zoom: 14
    })

    map.current.on('load', () => {
      new maptilersdk.Marker({ color: '#4A90E2' })
        .setLngLat([DEFAULT_LNG, DEFAULT_LAT])
        .addTo(map.current)
    })
  }, [])

  return (
    <div
      ref={mapContainer}
      style={{ width: '100vw', height: '100vh' }}
    />
  )
}

export default Map