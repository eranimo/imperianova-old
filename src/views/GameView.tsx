import React, { useEffect, useState, useContext } from 'react';
import { Grid, Spinner, Heading, Flex, Box, ButtonGroup, Button, IconButton, Divider } from '@chakra-ui/core';
import { GameClient } from '../game/GameClient';
import { FaPlay, FaPause, FaBackward, FaForward, FaMinus, FaPlus } from 'react-icons/fa';
import { useObservable } from 'react-use';
import { GameSpeed, GAME_SPEED_TITLE } from '../game/shared';


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
  
  (window as any).client = client;

  return (
    <Box>
      <ButtonGroup spacing={5}>
        <TimeControls />
      </ButtonGroup>
      <TimeDisplay />
    </Box>
  )
}

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
      <Box m={5}>
        <GameControls />
      </Box>
    </GameClientContext.Provider>
  );
}

export default GameView;
