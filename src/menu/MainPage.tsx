import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from "pixi.js";
import { initGame } from '../mapviewer/MapViewer';
import { WorldMap } from '../mapviewer/WorldMap';
import { Minimap } from '../mapviewer/Minimap';
import { MapManager } from '../mapviewer/MapManager';
import { IconButton, Box, Spinner, DarkMode, Button, Tooltip, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Input, InputGroup, InputLeftAddon, ModalFooter, Stack, FormControl, FormErrorMessage, Text } from '@chakra-ui/core';
import { FaArrowsAlt, FaSearch } from 'react-icons/fa';


const WORLD_SIZE = 100;

const FindHex: React.FC<{ manager: MapManager }> = ({ manager }) => {
  const [isOpen, setOpen] = useState(false);
  const [hasError, setError] = useState(false);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  const handleSubmit = () => {
    if (x !== null && y !== null) {
      const result = manager.jumpToHex(x, y);
      setError(!result);
      if (result) {
        setOpen(false);
        manager.selectHex(x, y);
      }
    }
  }
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => setOpen(false)}
        blockScrollOnMount
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Find Hex</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={3}>
              Enter the hex coordinate below to jump to and select that hex.
            </Text>
            <FormControl isInvalid={hasError}>
              <Stack isInline>
                <InputGroup size="sm">
                  <InputLeftAddon children="X" />
                  <Input
                    type="number"
                    value={x}
                    onChange={event => setX(parseInt(event.target.value, 10))}
                    min={0}
                    max={manager.worldMap$.value.size.width}
                  />
                </InputGroup>
                <InputGroup size="sm">
                  <InputLeftAddon children="Y" />
                  <Input
                    type="number"
                    value={y}
                    onChange={event => setY(parseInt(event.target.value, 10))}
                    min={0}
                    max={manager.worldMap$.value.size.height}
                  />
                </InputGroup>
              </Stack>
              <FormErrorMessage>Invalid hex coordinate</FormErrorMessage>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variantColor="blue" mr={3} onClick={handleSubmit}>
              Go
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Tooltip
        label="Find Hex"
        aria-label=""
        bg="gray.900"
        color="gray.50"
        placement="top"
      >
        <IconButton
          aria-label="Find hex"
          icon={FaSearch}
          color="gray.200"
          onClick={() => setOpen(true)}
        />
      </Tooltip>
    </>
  );
}

export const MainPageLoaded: React.FC<{
  resources: PIXI.IResourceDictionary,
}> = ({ resources }) => {
  const mapViewerRef = useRef(null);
  const minimapRef = useRef(null);

  const map = new WorldMap({
    size: WORLD_SIZE
  });
  const manager = new MapManager(map);
  useEffect(() => {
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

      <Box
        p={1}
        style={{
          backgroundColor: 'rgba(50, 50, 50, 0.75)',
          position: 'fixed',
          right: 0,
          width: '300px',
          bottom: '150px',
        }}
      >
        <Stack isInline spacing={1}>
          <Box>
            <Tooltip
              label="Reset viewport"
              aria-label=""
              bg="gray.900"
              color="gray.50"
              placement="top"
            >
              <IconButton
                aria-label="Reset viewport"
                icon={FaArrowsAlt}
                color="gray.200"
                onClick={() => manager.resetViewport()}
              />
            </Tooltip>
          </Box>
          {manager && <Box><FindHex manager={manager} /></Box>}
        </Stack>
      </Box>

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
      <Box>
        ImperiaNova
        <Spinner />
      </Box>
    );
  }
  return <MainPageLoaded resources={resources} />;
}
