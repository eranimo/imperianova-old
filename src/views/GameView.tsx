import React, { useEffect, useState, useContext } from 'react';
import { Grid, Spinner, Heading, Flex, Box, ButtonGroup, Button, IconButton, Divider, Link, List, ListItem } from '@chakra-ui/core';
import { GameClient } from '../game/GameClient';
import { FaPlay, FaPause, FaBackward, FaForward, FaMinus, FaPlus } from 'react-icons/fa';
import { useObservable, useEffectOnce } from 'react-use';
import { GameSpeed, GAME_SPEED_TITLE, EntityType, entityTypes } from '../game/shared';
import { useObservableSet } from '../game/ObservableSet';


const client = new GameClient();

const LoadingScreen: React.FC = ({ children }) => (
  <Grid justifyContent="center" alignItems="center" height="100vh" alignContent="center">
    <Box bg="gray.700" p={5} rounded={2}>
      <Heading size="md" mb={5} color="blue.50">{children}</Heading>
      <Flex justifyContent="center" alignItems="center" alignContent="center">
        <Spinner justifyContent="center" size="xl" />
      </Flex>
    </Box>
  </Grid>
);

export const GameClientContext = React.createContext<GameClient>(null);

const TimeDisplay = () => {
  const client = useContext(GameClientContext);
  const day = useObservable(client.days$, client.days$.value);
  return <>{day}</>;
}

const TimeControls = () => {
  const client = useContext(GameClientContext);
  const isPlaying = useObservable(client.isPlaying$, client.isPlaying$.value);
  const canGoSlower = useObservable(client.canGoSlower$, client.speed$.value !== GameSpeed.SLOW);
  const canGoFaster = useObservable(client.canGoFaster$, client.speed$.value !== GameSpeed.FAST);
  const speed = useObservable(client.speed$, client.speed$.value);

  // console.log('GameControls isPlaying', isPlaying);
  return (
    <ButtonGroup spacing={2}>
      <Button
        leftIcon={isPlaying ? FaPause : FaPlay}
        onClick={() => {
          if (isPlaying) {
            client.pause()
          } else {
            client.play()
          }
        }}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
      <IconButton
        aria-label="Slower"
        icon={FaMinus}
        isDisabled={!canGoSlower}
        onClick={() => {
          client.setSpeed(speed - 1);
        }}
      />
      <Button variant="ghost">
        {GAME_SPEED_TITLE[speed]}
      </Button>
      <IconButton
        aria-label="Faster"
        icon={FaPlus}
        isDisabled={!canGoFaster}
        onClick={() => {
          client.setSpeed(speed + 1);
        }}
      />
    </ButtonGroup>
  );
}

const GameControls: React.FC = () => {
  return (
    <Box>
      <ButtonGroup spacing={5}>
        <TimeControls />
      </ButtonGroup>
      <TimeDisplay />
    </Box>
  )
}

const EntityDetails: React.FC<{
  entityType: EntityType,
  entityID: number,
}> = ({ entityType, entityID }) => {
  const client = useContext(GameClientContext);
  useEffect(() => {
    client.watchEntity(entityType, entityID);
    return () => client.unwatchEntity(entityType, entityID);
  }, [entityType, entityID]);
  const entityView = useObservable(
    client.entityViewManager.entityViewStore.get(EntityType.POP).getEntity$(entityID),
    client.entityViewManager.entityViewStore.get(EntityType.POP).getEntity$(entityID).value,
  );
  // console.log(entityType, entityID, entityView);
  return (
    <Box>
      EntityType: {entityType}<br />
      EntityID: {entityID}<br />
      {JSON.stringify(entityView, null, 2)}
    </Box>
  )
}

const EntityTypeList: React.FC<{
  entityType: EntityType,
  activeEntityID: number,
  setActiveEntityID: (value: number) => void,
}> = ({ entityType, activeEntityID, setActiveEntityID }) => {
  const client = useContext(GameClientContext);
  const entities = useObservableSet(client.entityViewManager.entityViewStore.get(entityType).entities$);
  return (
    <Box>
      <Heading size="md">{entityType} entities:</Heading>
      <List spacing={5}>
        {entities.map(entity => (
          <div key={entity.entityID}>
            <ListItem
              onClick={() => {
                if (activeEntityID === entity.entityID) {
                  setActiveEntityID(null);
                } else {
                  setActiveEntityID(entity.entityID);
                }
              }}
              style={{ fontWeight: activeEntityID === entity.entityID ? 'bold' : 'normal' }}
            >
              {entity.entityID}
            </ListItem>
          </div>
        ))}
      </List>
    </Box>
  )
}

const EntityDebug = () => {
  const [activeEntityType, setActiveEntityType] = useState(null);
  const [activeEntityID, setActiveEntityID] = useState(null);
  return (
    <Grid templateColumns="repeat(3, 1fr)">
      <Box>
        <Heading size="md">Entity Types:</Heading>
        <List spacing={5}>
          {entityTypes.map(entityType => (
            <div key={entityType}>
              <ListItem
                onClick={() => {
                  if (entityType === activeEntityType) {
                    setActiveEntityType(null);
                  } else {
                    setActiveEntityType(entityType);
                  }
                }}
                style={{ fontWeight: activeEntityType === entityType ? 'bold' : 'normal' }}
              >
                {entityType}
              </ListItem>
            </div>
          ))}
        </List>
      </Box>
      {activeEntityType && <EntityTypeList entityType={activeEntityType} activeEntityID={activeEntityID} setActiveEntityID={setActiveEntityID} />}
      {activeEntityType && activeEntityID !== null && <EntityDetails entityType={activeEntityType} entityID={activeEntityID} />}
    </Grid>
  )
};

export const GameView: React.FC = ({ }) => {
  const [isLoaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!client.initialized) {
      client.init().then(() => {
        setLoaded(true);
      });
    }

    return () => client.destroy();
  }, []);

  if (!isLoaded) {
    return <LoadingScreen>Loading Game</LoadingScreen>;
  }

  return (
    <GameClientContext.Provider value={client}>
      <Box m={5} style={{ height: '100vh', overflow: 'auto' }}>
        <GameControls />
        <EntityDebug />
      </Box>
    </GameClientContext.Provider>
  );
}

export default GameView;
