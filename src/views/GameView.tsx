import React, { useEffect, useState, useContext } from 'react';
import { Grid, Spinner, Heading, Flex, Box, ButtonGroup, Button } from '@chakra-ui/core';
import { GameClient } from '../game/GameClient';
import { FaPlay, FaPause } from 'react-icons/fa';
import { useObservable } from 'react-use';


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
  const day = useObservable(client.day$, client.day);

  return (
    <span>
      {day}
    </span>
  );
}
const GameControls: React.FC = () => {
  const client = useContext(GameClientContext);
  (window as any).client = client;
  const playState = useObservable(client.playState$, client.playState);
  
  console.log('GameControls playState', playState);
  return (
    <Box>
      <ButtonGroup spacing={5}>
        <Button
          leftIcon={playState.isPlaying ? FaPause : FaPlay}
          onClick={() => {
            if (playState.isPlaying) {
              client.pause()
            } else {
              client.play()
            }
          }}
        >
          {playState.isPlaying ? 'Pause' : 'Play'}
        </Button>
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
