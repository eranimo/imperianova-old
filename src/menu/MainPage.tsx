import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from "pixi.js";
import { MapViewer } from '../mapviewer/MapViewer';
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
        setX(0);
        setY(0);
        manager.selectHex(x, y);
      }
    }
  }
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setOpen(false);
          setX(0);
          setY(0);
        }}
        blockScrollOnMount
      >
        <ModalOverlay />
        <form onSubmit={handleSubmit}>
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
              <Button type="submit" variantColor="blue" mr={3}>
                Go
              </Button>
            </ModalFooter>
          </ModalContent>
        </form>
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
    const parser = new DOMParser();
    let fontXMLRaw = require('raw-loader!../assets/eightbitdragon.fnt').default;
    const pageFile = require('file-loader!../assets/eightbitdragon_0.png')
    fontXMLRaw = fontXMLRaw.replace('eightbitdragon_0.png', pageFile);
    const fontXML = parser.parseFromString(fontXMLRaw, 'text/xml');
    const font = PIXI.BitmapText.registerFont(fontXML, {
      [pageFile]: resources.fontPng.texture,
    });

    const mapViewer = new MapViewer(mapViewerRef.current, manager, resources, { eightBitDragon: font })
    const minimap = new Minimap(minimapRef.current, manager)

    return () => {
      minimap.destroy();
      mapViewer.destroy();
    };
  }, []);

  return (
    <>
      <div ref={mapViewerRef} tabIndex={0}></div>

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
    loader.add('uiPNG', require('../assets/ui.png'));
    loader.add('terrainPNG', require('../assets/tilesets/terrain.tileset.png'));
    loader.add('terrainJSON', require('../assets/tilesets/terrain.tileset.json'));
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
