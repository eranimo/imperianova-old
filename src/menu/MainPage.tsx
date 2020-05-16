import React, { useEffect } from 'react';
import { initGame } from '../mapviewer/MapViewer';


export const MainPage: React.FC = () => {
  useEffect(() => initGame(), []);
  return (
    <div id="map-viewer">
      
    </div>
  )
}