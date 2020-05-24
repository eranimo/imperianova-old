import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from "pixi.js";
import { initGame } from '../mapviewer/MapViewer';
import { WorldMap } from '../mapviewer/WorldMap';
import { initMinimap } from '../mapviewer/Minimap';
import { CircularProgress, Container } from '@material-ui/core';


const WORLD_SIZE = 200;

export const MainPageLoaded: React.FC<{
  resources: PIXI.IResourceDictionary,
}> = ({ resources }) => {
  const mapViewerRef = useRef(null);
  const minimapRef = useRef(null);

  useEffect(() => {
    const map = new WorldMap({
      size: WORLD_SIZE
    });
    initGame(mapViewerRef.current, map, resources);
    // initMinimap(minimapRef.current, map)
  }, []);

  return (
    <>
      <div ref={mapViewerRef}>
      </div>

      {/* <canvas ref={minimapRef} /> */}
    </>
  )
}

export const MainPage: React.FC = () => {
  const [resources, setResources] = useState(null);
  useEffect(() => {
    const loader = new PIXI.Loader();
    loader.add('tilemap', require('../images/tilemap.png'));
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
