import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from "pixi.js";
import { initGame } from '../mapviewer/MapViewer';
import { WorldMap } from '../mapviewer/WorldMap';
import { Minimap } from '../mapviewer/Minimap';
import { CircularProgress, Container } from '@material-ui/core';
import { MapManager } from '../mapviewer/MapManager';


const WORLD_SIZE = 100;

export const MainPageLoaded: React.FC<{
  resources: PIXI.IResourceDictionary,
}> = ({ resources }) => {
  const mapViewerRef = useRef(null);
  const minimapRef = useRef(null);

  useEffect(() => {
    const map = new WorldMap({
      size: WORLD_SIZE
    });
    const manager = new MapManager(map);
    const destroyApp = initGame(mapViewerRef.current, manager, resources);
    const minimap = new Minimap(minimapRef.current, manager)

    return () => {
      minimap.destroy();
      destroyApp();
    }
  }, []);

  return (
    <>
      <div ref={mapViewerRef}>
      </div>

      <div
        className="minimap"
        style={{
          border: '1px solid #111',
          backgroundColor: '#000',
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: 300,
          height: 150,
        }}
        ref={minimapRef}
      >
      </div>
    </>
  )
}

export const MainPage: React.FC = () => {
  const [resources, setResources] = useState(null);
  useEffect(() => {
    const loader = new PIXI.Loader();
    loader.add('tilemap', require('../images/tilemap.png'));
    loader.add('terrainPNG', require('../assets/tilesets/coastline-sectional.tileset.png'));
    loader.add('terrainJSON', require('../assets/tilesets/coastline-sectional.tileset.json'));
    loader.add('fontPng', require('../assets/eightbitdragon_0.png'));
    loader.onError.add(error => console.error(error));
    loader.load(({ resources }) => {
      setResources(resources);
    });
  }, []);

  if (resources === null) {
    return (
      <Container>
        <CircularProgress />
      </Container>
    );
  }
  return <MainPageLoaded resources={resources} />;
}
