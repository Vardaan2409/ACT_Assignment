import React, { useState, useEffect, useRef } from 'react';
import API from '../utils/api';
import Navbar from '../components/Navbar';
import {
  MapPin,
  Search,
  Sliders,
  CheckCircle2,
  Compass,
  ArrowRight,
  School,
  Activity,
  Trees,
  Utensils,
  Train,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Grid,
  Map as MapIcon,
  Plus
} from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

const MapExplore = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Search parameters
  const [searchText, setSearchText] = useState('');
  const [radiusKm, setRadiusKm]     = useState(10);
  const [searchLat, setSearchLat]   = useState(28.6139); // Delhi Center
  const [searchLng, setSearchLng]   = useState(77.2090);
  const [searchType, setSearchType] = useState('radius'); // 'radius' | 'all' | 'polygon'

  // Selected property for Landmark/Proximity view
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Layout View mode for Mobile
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  // Ref to container for fallback map rendering
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const fetchProperties = async () => {
    setLoading(true);
    setError('');
    try {
      let url = '/api/properties/search';
      const params = {};

      if (searchText) params.search = searchText;

      if (searchType === 'radius') {
        params.lat = searchLat;
        params.lng = searchLng;
        params.radius = radiusKm;
      } else if (searchType === 'polygon') {
        // Draw polygon mock coordinates: bounding box around the selected city
        // We will simulate polygon coordinates representing NCR bounds
        params.polygon = "77.0,28.4;77.5,28.4;77.5,28.8;77.0,28.8;77.0,28.4";
      }

      const { data } = await API.get(url, { params });
      setProperties(data);
      if (data.length > 0) {
        setSelectedProperty(data[0]);
      } else {
        setSelectedProperty(null);
      }
    } catch (err) {
      console.error(err);
      setError('Geospatial search error. Make sure Database index exists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [searchType, radiusKm, searchLat, searchLng]);

  // Leaflet.js fallback setup so we are completely production-resilient if Mapbox token is missing
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up previous Leaflet instance if present
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Dynamic Leaflet Loading
    const loadLeaflet = () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        if (!window.L || !mapContainerRef.current) return;

        const L = window.L;
        const map = L.map(mapContainerRef.current).setView([searchLat, searchLng], 10);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        // Add markers
        properties.forEach((prop) => {
          const coords = prop.locationCoords?.coordinates || [77.2090, 28.6139];
          const isSelected = selectedProperty && selectedProperty._id === prop._id;
          
          const markerColor = isSelected ? '#4f46e5' : '#1e293b';
          const customIcon = L.divIcon({
            html: `<div style="background-color: ${markerColor}; color: white; padding: 6px 12px; border-radius: 9999px; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); width: fit-content; white-space: nowrap;">₹${(prop.price / 100000).toFixed(0)}L</div>`,
            className: 'custom-div-icon',
            iconSize: [60, 30],
            iconAnchor: [30, 15]
          });

          const marker = L.marker([coords[1], coords[0]], { icon: customIcon }).addTo(map);
          
          marker.on('click', () => {
            setSelectedProperty(prop);
            map.setView([coords[1], coords[0]], 12, { animate: true });
          });
        });
      };
      document.head.appendChild(script);
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [properties, selectedProperty]);

  // Quick switch search focus to city center coords
  const handleCitySwitch = (city) => {
    if (city === 'Delhi') {
      setSearchLat(28.6139);
      setSearchLng(77.2090);
    } else if (city === 'Mumbai') {
      setSearchLat(19.0016);
      setSearchLng(72.8183);
    } else if (city === 'Bangalore') {
      setSearchLat(12.9698);
      setSearchLng(77.7499);
    }
  };

  const getLandmarkIcon = (type) => {
    switch (type) {
      case 'school': return <School className="w-4 h-4 text-indigo-500" />;
      case 'hospital': return <Activity className="w-4 h-4 text-red-500" />;
      case 'park': return <Trees className="w-4 h-4 text-emerald-500" />;
      case 'restaurant': return <Utensils className="w-4 h-4 text-amber-500" />;
      case 'metro': return <Train className="w-4 h-4 text-sky-500" />;
      default: return <MapPin className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen overflow-hidden">
      <Navbar />

      {/* Main Exploration Pane */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

        {/* --- LEFT PANEL: LISTINGS & SEARCH CONTROLS --- */}
        <div className={`w-full md:w-[45%] lg:w-[40%] flex flex-col bg-white border-r border-slate-100 h-full overflow-hidden ${
          viewMode === 'map' ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* Geospatial Search Section */}
          <div className="p-5 border-b border-slate-100 bg-white space-y-4">
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
              <Compass className="w-6 h-6 text-indigo-600 animate-spin-slow" />
              <span>Map Discovery</span>
            </h1>

            {/* Keyword search bar */}
            <div className="relative group">
              <input
                type="text"
                placeholder="Search title, description, city..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 group-focus-within:text-indigo-600 transition-colors" />
              <button 
                onClick={fetchProperties}
                className="absolute right-2.5 top-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl transition-all"
              >
                Search
              </button>
            </div>

            {/* Geo Query Selector Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-500">
              <button
                onClick={() => setSearchType('radius')}
                className={`flex-1 py-2 text-center rounded-lg transition-all ${
                  searchType === 'radius' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-950'
                }`}
              >
                Radius Search
              </button>
              <button
                onClick={() => setSearchType('polygon')}
                className={`flex-1 py-2 text-center rounded-lg transition-all ${
                  searchType === 'polygon' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-950'
                }`}
              >
                Draw Area (Delhi Bound)
              </button>
              <button
                onClick={() => setSearchType('all')}
                className={`flex-1 py-2 text-center rounded-lg transition-all ${
                  searchType === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-950'
                }`}
              >
                Show All
              </button>
            </div>

            {/* Radius Slider / Quick Switch */}
            {searchType === 'radius' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Proximity Radius</span>
                  <span className="text-indigo-600">{radiusKm} km</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={50}
                  step={2}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />

                {/* Quick center switches */}
                <div className="flex items-center space-x-2 pt-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Quick Jump:</span>
                  {['Delhi', 'Mumbai', 'Bangalore'].map(c => (
                    <button
                      key={c}
                      onClick={() => handleCitySwitch(c)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 hover:border-indigo-400 text-slate-600 hover:text-indigo-600 transition-all"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Listing List Container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-600"></div>
                <p className="text-slate-400 text-xs font-semibold">Updating viewport listings...</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <p className="text-slate-400 font-bold text-sm">No properties in this range.</p>
                <p className="text-xs text-slate-400">Try expanding the proximity slider radius.</p>
              </div>
            ) : (
              properties.map((prop) => {
                const isSelected = selectedProperty && selectedProperty._id === prop._id;
                return (
                  <div
                    key={prop._id}
                    onClick={() => setSelectedProperty(prop)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/20 shadow-md shadow-indigo-50/50'
                        : 'border-slate-100 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-extrabold text-sm text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {prop.title}
                        </h3>
                        {prop.activeBoost && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-md flex-shrink-0">
                            PRO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-semibold flex items-center mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0" />
                        <span>{prop.location}</span>
                      </p>
                      <p className="text-xs text-slate-500 font-semibold line-clamp-2 mt-2 leading-relaxed">
                        {prop.description}
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100/50">
                      <span className="text-sm font-black text-indigo-600">
                        ₹{(prop.price / 100000).toFixed(1)} Lakhs
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        Rank Score: {prop.rankingScore}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* --- RIGHT PANEL: DETAILED METRICS / MAP SPLIT --- */}
        <div className={`flex-1 flex flex-col h-full overflow-hidden ${
          viewMode === 'list' ? 'hidden md:flex' : 'flex'
        }`}>
          {/* The interactive Map container */}
          <div className="flex-1 bg-slate-100 relative min-h-[300px]">
            <div ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full" />
            
            {/* Map floating prompt */}
            <div className="absolute top-4 left-4 z-[999] bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-100 flex items-center space-x-1.5 shadow-md">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Map Active</span>
            </div>
          </div>

          {/* Selected Property Proximity Landmarks Drawer */}
          {selectedProperty && (
            <div className="bg-white border-t border-slate-100 p-5 space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-base">
                    {selectedProperty.title}
                  </h4>
                  <p className="text-xs text-slate-400 font-semibold flex items-center mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1" />
                    <span>Coordinates: {selectedProperty.locationCoords?.coordinates?.join(', ')}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-indigo-600">
                    ₹{(selectedProperty.price / 100000).toFixed(1)} Lakhs
                  </span>
                </div>
              </div>

              {/* Proximity landmarks */}
              <div>
                <h5 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2.5">
                  Proximity Landmarks
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedProperty.nearbyPlaces && selectedProperty.nearbyPlaces.length > 0 ? (
                    selectedProperty.nearbyPlaces.slice(0, 6).map((landmark, idx) => (
                      <div key={idx} className="flex items-center space-x-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                          {getLandmarkIcon(landmark.type)}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-black text-slate-800 line-clamp-1 leading-snug">
                            {landmark.name}
                          </p>
                          <p className="text-[9px] text-slate-400 font-extrabold mt-0.5 leading-none">
                            {landmark.distance}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-4 text-center text-xs text-slate-400 font-bold">
                      No landmarks listed for this segment.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- MOBILE VIEW TOGGLE ACTION BANNER --- */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] flex md:hidden bg-slate-900 text-white rounded-full p-1.5 shadow-xl">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Listings ({properties.length})</span>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              viewMode === 'map' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>MapView</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default MapExplore;
