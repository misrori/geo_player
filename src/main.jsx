import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Home from './pages/Home.jsx'
import TourDetail from './pages/TourDetail.jsx'
import TourPlayer from './pages/TourPlayer.jsx'
import CustomGpx from './pages/CustomGpx.jsx'
import './index.css'
import 'leaflet/dist/leaflet.css'

// Dev módban töröljük a régi service worker-eket, hogy ne interferáljanak
// a friss kód betöltésével (egy korábbi build SW-je cache-elhetett 404-et).
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
  if (window.caches) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="tour/:id" element={<TourDetail />} />
          <Route path="tour/:id/play" element={<TourPlayer />} />
          <Route path="custom" element={<CustomGpx />} />
          <Route path="custom/play" element={<TourPlayer custom />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
)
