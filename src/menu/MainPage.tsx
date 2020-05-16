import React, { useEffect, useRef } from 'react';
import { initGame } from '../mapviewer/MapViewer';


export const MainPage: React.FC = () => {
  const mapViewerRef = useRef(null);
  useEffect(() => initGame(mapViewerRef.current), []);
  return (
    <div ref={mapViewerRef}>
    </div>
  )
}