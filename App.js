import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { GameEngine } from 'react-native-game-engine';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeviceMotion } from 'expo-sensors';

const { width, height } = Dimensions.get('window');

function GameComponent() {
  const [running, setRunning] = useState(true);
  const insets = useSafeAreaInsets();

  // Define the ball entity.
  const ball = {
    position: { x: width / 2 - 25, y: height / 2 },
    size: 50,
    velocity: { x: 1, y: 1 },
    renderer: (props) => {
      const { position, size } = props;
      return (
        <View
          style={{
            backgroundColor: 'red',
            position: 'absolute',
            left: position.x,
            top: position.y,
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
        />
      );
    },
  };

  // Define the bat entity.
  const bat = {
    position: { x: width / 2 - 50, y: height - 20 },
    size: 100, // bat width
    renderer: (props) => {
      const { position, size } = props;
      return (
        <View
          style={{
            backgroundColor: 'green',
            position: 'absolute',
            left: position.x,
            top: height - 20, // fixed top for the bat
            width: size,
            height: size / 5, // bat height (20)
            borderRadius: size / 2,
          }}
        />
      );
    },
  };

  // Store entities in a ref so they remain stable and are mutable.
  const entitiesRef = useRef({ ball, bat });

  // Subscribe to device motion sensor data.
  useEffect(() => {
    // Set sensor update interval (milliseconds)
    DeviceMotion.setUpdateInterval(16);
    
    // Subscribe to the sensor.
    const subscription = DeviceMotion.addListener((data) => {
      // Check that rotation data is available.
      if (data.rotation) {
        // 'gamma' is used for left/right tilt.
        const gamma = data.rotation.gamma;
        // Define the maximum tilt (in radians) that moves the bat to the edge.
        const maxTilt = 0.5; // adjust this value based on your testing
        // Clamp gamma between -maxTilt and maxTilt.
        const clampedGamma = Math.max(-maxTilt, Math.min(maxTilt, gamma));
        // Normalize: (-maxTilt => 0, maxTilt => 1)
        const normalized = (clampedGamma + maxTilt) / (2 * maxTilt);
        // Map normalized value to a horizontal position for the bat.
        const newBatX = normalized * (width - bat.size);
        // Update the bat entity position.
        entitiesRef.current.bat.position.x = newBatX;
      }
    });
    
    // Cleanup subscription on unmount.
    return () => subscription.remove();
  }, []);

  // Update system for GameEngine: moves ball and detects collisions.
  function update(entities, { time }) {
    const ballEntity = entities.ball;
    const batEntity = entities.bat;

    // Move ball based on its velocity.
    ballEntity.position.x += ballEntity.velocity.x * time.delta;
    ballEntity.position.y += ballEntity.velocity.y * time.delta;

    // Check wall collisions for the ball.
    if (ballEntity.position.x < 0) {
      ballEntity.velocity.x = Math.abs(ballEntity.velocity.x);
    }
    if (ballEntity.position.x + ballEntity.size > width) {
      ballEntity.velocity.x = -Math.abs(ballEntity.velocity.x);
    }
    if (ballEntity.position.y < 0) {
      ballEntity.velocity.y = Math.abs(ballEntity.velocity.y);
    }
    
    // Check collision when the ball reaches the bat region.
    if (ballEntity.velocity.y > 0 && ballEntity.position.y + ballEntity.size >= height - 20) {
      if (
        ballEntity.position.x + ballEntity.size >= batEntity.position.x &&
        ballEntity.position.x <= batEntity.position.x + batEntity.size
      ) {
        // Bounce ball upward.
        ballEntity.velocity.y = -Math.abs(ballEntity.velocity.y);
      } else {
        // If the ball misses the bat, stop the game.
        setRunning(false);
      }
    }

    return entities;
  }

  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom }}>
      <GameEngine
        running={running}
        entities={entitiesRef.current}
        systems={[update]}
        style={{ flex: 1, backgroundColor: 'white' }}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GameComponent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
