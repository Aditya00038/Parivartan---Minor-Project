'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Status colors for markers
const statusColors = {
  Pending: { primary: '#ef4444', secondary: '#dc2626' },
  'In Progress': { primary: '#f59e0b', secondary: '#d97706' },
  Resolved: { primary: '#22c55e', secondary: '#16a34a' },
  default: { primary: '#3b82f6', secondary: '#2563eb' }
};

// Create custom marker icon based on status
const createReportIcon = (status?: string, isAnimated = false) => {
  const colors = statusColors[status as keyof typeof statusColors] || statusColors.default;
  return L.divIcon({
    className: 'custom-report-marker',
    html: `<div style="
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      ${isAnimated ? 'animation: pulse 2s infinite;' : ''}
      position: relative;
    ">
      <div style="
        width: 10px;
        height: 10px;
        background: white;
        border-radius: 50%;
      "></div>
      <div style="
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid ${colors.secondary};
      "></div>
    </div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
};

// Cluster marker for multiple reports
const createClusterIcon = (count: number) => L.divIcon({
  className: 'custom-cluster-marker',
  html: `<div style="
    width: ${count > 50 ? 56 : count > 20 ? 48 : count > 10 ? 42 : 36}px;
    height: ${count > 50 ? 56 : count > 20 ? 48 : count > 10 ? 42 : 36}px;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    border: 4px solid white;
    border-radius: 50%;
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: white;
    font-size: ${count > 50 ? 16 : count > 10 ? 14 : 12}px;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  ">${count > 99 ? '99+' : count}</div>`,
  iconSize: [count > 50 ? 56 : count > 20 ? 48 : count > 10 ? 42 : 36, count > 50 ? 56 : count > 20 ? 48 : count > 10 ? 42 : 36],
  iconAnchor: [(count > 50 ? 56 : count > 20 ? 48 : count > 10 ? 42 : 36) / 2, (count > 50 ? 56 : count > 20 ? 48 : count > 10 ? 42 : 36) / 2],
});

interface ReportLocation {
  lat: number;
  lng: number;
  location?: string;
  count?: number;
  status?: string;
  type?: string;
  date?: string;
  category?: string; // Report category for filtering
  department?: string;
  reportId?: string; // Add report ID for linking
  imageUrl?: string; // Add image URL for preview
  description?: string; // Add description
  priority?: string; // Add priority
}

interface MaharashtraMapProps {
  data: ReportLocation[];
  className?: string;
  selectedCategories?: string[]; // Categories to display
  selectedStatuses?: string[]; // Statuses to display
}

// Pune bounds (tight fit around the city)
const PUNE_BOUNDS: L.LatLngBoundsExpression = [
  [18.35, 73.65], // Southwest
  [18.70, 74.05]  // Northeast
];

// Pune center
const PUNE_CENTER: L.LatLngExpression = [18.5204, 73.8567]; // Pune city center

// Tile layer options for different map styles
const tileLayers = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
  },
  streets: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }
};

export default function HeatMap({ 
  data, 
  className = '',
  selectedCategories = [],
  selectedStatuses = []
}: MaharashtraMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [activeLayer, setActiveLayer] = useState<'satellite' | 'terrain' | 'streets' | 'dark'>('streets');
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Filter data based on selected categories and statuses
  const filteredData = data.filter(point => {
    const categoryMatch = selectedCategories.length === 0 || !point.category || selectedCategories.includes(point.category);
    const statusMatch = selectedStatuses.length === 0 || !point.status || selectedStatuses.includes(point.status);
    return categoryMatch && statusMatch;
  });

  // Initialize map only once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    mapInstanceRef.current = L.map(mapRef.current, {
      center: PUNE_CENTER,
      zoom: 12,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: false,
      scrollWheelZoom: true,
    });

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(mapInstanceRef.current);

    // Use CartoDB Voyager for clean, modern look
    tileLayerRef.current = L.tileLayer(tileLayers.streets.url, {
      attribution: tileLayers.streets.attribution,
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    // Add Pune city boundary overlay (approximate)
    const puneBoundary = L.polygon([
      [18.62, 73.72], [18.65, 73.78], [18.64, 73.85], [18.60, 73.92],
      [18.55, 73.95], [18.48, 73.94], [18.42, 73.90], [18.38, 73.85],
      [18.40, 73.78], [18.44, 73.72], [18.50, 73.68], [18.56, 73.68],
      [18.62, 73.72]
    ], {
      color: '#6366f1',
      weight: 3,
      fillColor: '#6366f1',
      fillOpacity: 0.03,
      dashArray: '8, 4'
    }).addTo(mapInstanceRef.current);

    // Initialize markers layer
    markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);

    // Add legend control using custom Control class
    const LegendControl = L.Control.extend({
      options: { position: 'bottomright' as L.ControlPosition },
      onAdd: function() {
      const div = L.DomUtil.create('div', 'map-legend');
      div.innerHTML = `
        <div style="
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(8px);
          padding: 12px 16px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          font-size: 12px;
          ">
            <div style="font-weight: 600; margin-bottom: 8px; color: #1f2937;">Report Status</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 14px; height: 14px; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
                <span style="color: #4b5563;">Pending</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 14px; height: 14px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
                <span style="color: #4b5563;">In Progress</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 14px; height: 14px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
                <span style="color: #4b5563;">Resolved</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 14px; height: 14px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
                <span style="color: #4b5563;">Cluster</span>
              </div>
            </div>
          </div>
        `;
        return div;
        }
      });
      new LegendControl().addTo(mapInstanceRef.current);

      // Add layer switcher control using custom Control class
      const LayerControl = L.Control.extend({
        options: { position: 'topleft' as L.ControlPosition },
        onAdd: function() {
        const div = L.DomUtil.create('div', 'layer-switcher');
        div.innerHTML = `
          <div style="
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(8px);
            padding: 8px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            display: flex;
            gap: 4px;
          ">
            <button id="btn-streets" style="
              padding: 6px 10px;
              border-radius: 8px;
              border: none;
              background: #6366f1;
              color: white;
              font-size: 11px;
              cursor: pointer;
              font-weight: 500;
            ">Streets</button>
            <button id="btn-satellite" style="
              padding: 6px 10px;
              border-radius: 8px;
              border: none;
              background: #e5e7eb;
              color: #374151;
              font-size: 11px;
              cursor: pointer;
              font-weight: 500;
            ">Satellite</button>
            <button id="btn-terrain" style="
              padding: 6px 10px;
              border-radius: 8px;
              border: none;
              background: #e5e7eb;
              color: #374151;
              font-size: 11px;
              cursor: pointer;
              font-weight: 500;
            ">Terrain</button>
          </div>
        `;
        
        // Add event listeners
        setTimeout(() => {
          const map = mapInstanceRef.current;
          if (!map) return;
          
          div.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const target = e.target as HTMLButtonElement;
              const layerType = target.id.replace('btn-', '') as 'streets' | 'satellite' | 'terrain';
              
              // Update button styles
              div.querySelectorAll('button').forEach(b => {
                (b as HTMLButtonElement).style.background = '#e5e7eb';
                (b as HTMLButtonElement).style.color = '#374151';
              });
              target.style.background = '#6366f1';
              target.style.color = 'white';
              
              // Switch tile layer
              if (tileLayerRef.current) {
                map.removeLayer(tileLayerRef.current);
              }
              tileLayerRef.current = L.tileLayer(tileLayers[layerType].url, {
                attribution: tileLayers[layerType].attribution,
                maxZoom: 19,
              }).addTo(map);
            });
          });
        }, 100);
        
        return div;
        }
      });
      new LayerControl().addTo(mapInstanceRef.current);

      // Add scale control
      L.control.scale({ position: 'bottomleft', imperial: false }).addTo(mapInstanceRef.current);

      // Fit bounds to Pune with animation
      mapInstanceRef.current.fitBounds(PUNE_BOUNDS, { padding: [30, 30] });
      
      setMapReady(true);

    // Cleanup only on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        tileLayerRef.current = null;
        setMapReady(false);
      }
    };
  }, []); // Empty dependency - only run once on mount

  // Update markers when data changes (separate effect)
  useEffect(() => {
    if (!mapReady || !markersLayerRef.current || !mapInstanceRef.current) return;
    
    markersLayerRef.current.clearLayers();

    filteredData.forEach(point => {
      if (point.lat && point.lng) {
        let marker: L.Marker;
        
        if (point.count && point.count > 1) {
          // Use cluster icon for multiple reports
          marker = L.marker([point.lat, point.lng], {
            icon: createClusterIcon(point.count)
          });
        } else {
          // Use status-colored icon for single reports
          marker = L.marker([point.lat, point.lng], {
            icon: createReportIcon(point.status)
          });
        }

        // Compact popup: image + key metadata only
        const popupContent = `
          <div style="min-width: 220px; max-width: 240px; padding: 0; border-radius: 12px; overflow: hidden;">
            ${point.imageUrl ? `
              <div style="width: 100%; height: 140px; overflow: hidden; background: #f3f4f6;">
                <img 
                  src="${point.imageUrl}" 
                  alt="Report" 
                  style="width: 100%; height: 100%; object-fit: cover;" 
                  class="map-popup-image"
                />
              </div>
            ` : ''}
            <div style="padding: 12px; background: white;">
              <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
                ${point.type ? `<div style="color: #374151;"><strong>Category:</strong> ${point.type}</div>` : ''}
                ${point.priority ? `<div style="color: #374151;"><strong>Priority:</strong> ${point.priority}</div>` : ''}
                ${point.date ? `<div style="color: #6b7280;"><strong>Reported:</strong> ${point.date}</div>` : ''}
              </div>
            </div>
          </div>
        `;
        
        marker.bindPopup(popupContent, {
          className: 'custom-popup',
          closeButton: true,
          autoPan: true,
          autoPanPaddingTopLeft: [16, 16],
          autoPanPaddingBottomRight: [16, 16],
          maxWidth: 250,
          minWidth: 220,
        });

        markersLayerRef.current?.addLayer(marker);
      }
    });
  }, [filteredData, mapReady]);

  return (
    <div className="relative w-full h-full">
      <style jsx global>{`
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 12px 48px rgba(0,0,0,0.25);
          padding: 0;
          border: 1px solid #e5e7eb;
          background: white;
        }
        .custom-popup .leaflet-popup-tip {
          box-shadow: 0 3px 14px rgba(0,0,0,0.15);
          border: 1px solid #e5e7eb;
        }
        .custom-popup .leaflet-popup-content {
          margin: 0;
          max-height: 280px;
          overflow-y: auto;
          scrollbar-width: thin;
        }
        .custom-popup .leaflet-popup-content::-webkit-scrollbar {
          width: 6px;
        }
        .custom-popup .leaflet-popup-content::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-popup .leaflet-popup-content::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .map-popup-image {
          display: block;
          width: 100%;
          height: 100%;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
      <div 
        ref={mapRef} 
        className={`w-full h-full min-h-[400px] rounded-xl overflow-hidden ${className}`}
        style={{ zIndex: 1, background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)' }}
      />
    </div>
  );
}
