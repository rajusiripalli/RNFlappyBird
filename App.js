import React, { useEffect, useState } from "react";
import {
  Canvas,
  useImage,
  Image,
  Group,
  Extrapolate,
  Text,
  matchFont,
  Circle,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  withTiming,
  Easing,
  withSequence,
  withRepeat,
  useFrameCallback,
  useDerivedValue,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  cancelAnimation,
} from "react-native-reanimated";
import {
  Platform,
  SafeAreaView,
  useWindowDimensions,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";

const GRAVITY = 1000;
const JUMP_FORCE = -500;
const pipeWidth = 104;
const pipeHeight = 640;

const App = () => {
  const { height, width } = useWindowDimensions();
  const [score, setScore] = useState(0);
  const bg = useImage(require("./assets/sprites/background-day.png"));
  const bird = useImage(require("./assets/sprites/yellowbird-upflap.png"));
  const pipeBottom = useImage(require("./assets/sprites/pipe-green.png"));
  const pipeTop = useImage(require("./assets/sprites/pipe-green-top.png"));
  const base = useImage(require("./assets/sprites/base.png"));

  const gameOver = useSharedValue(false);
  const x = useSharedValue(width);
  const birdY = useSharedValue(height / 3);
  const birdPos = {
    x: width / 4,
  };
  const birdYVelocity = useSharedValue(100);

  const birdCenterX = useDerivedValue(() => birdPos.x + 32);
  const birdCenterY = useDerivedValue(() => birdY.value + 24);
  const pipeOffset = 0;

  useEffect(() => {
    moveTheMap();
  }, []);

  const moveTheMap = () => {
    x.value = withRepeat(
      withSequence(
        withTiming(-150, {
          duration: 3000,
          easing: Easing.linear,
        }),
        withTiming(width, { duration: 0 })
      ),
      -1
    );
    //birdY.value = withTiming(height, { duration: 1000 });
  };

  //Scoring system
  useAnimatedReaction(
    () => x.value,
    (currentValue, previousValue) => {
      const middle = birdPos.x;

      if (
        currentValue !== previousValue &&
        previousValue &&
        currentValue < middle &&
        previousValue > middle
      ) {
        // do something ✨
        runOnJS(setScore)(score + 1);
      }
    }
  );

  //Collision detection
  useAnimatedReaction(
    () => birdY.value,
    (currentValue, previousValue) => {
      //Ground collision detection
      if (currentValue > height - 100 || currentValue < 0) {
        gameOver.value = true;
      }
      //bottom pipe
      if (
        birdCenterX.value > x.value &&
        birdCenterX.value < x.value + pipeWidth &&
        birdCenterY.value > height - 320 + pipeOffset &&
        birdCenterY.value < height - 320 + pipeOffset + pipeHeight
      ) {
        gameOver.value = true;
      }

      //top pipe
      if (
        birdCenterX.value > x.value &&
        birdCenterX.value < x.value + pipeWidth &&
        birdCenterY.value > pipeOffset - 320 &&
        birdCenterY.value < pipeOffset - 320 + pipeHeight
      ) {
        gameOver.value = true;
      }
    }
  );

  useAnimatedReaction(
    () => gameOver.value,
    (currentValue, previousValue) => {
      if (currentValue && !previousValue) {
        cancelAnimation(x);
      }
    }
  );

  useFrameCallback(({ timeSincePreviousFrame: dt }) => {
    if (!dt || gameOver.value) {
      return;
    }
    birdY.value = birdY.value + (birdYVelocity.value * dt) / 1000;
    birdYVelocity.value = birdYVelocity.value + (GRAVITY * dt) / 1000;
  });

  const restartGame = () => {
    "worklet";
    birdY.value = height / 3;
    birdYVelocity.value = 0;
    gameOver.value = false;
    x.value = width;
    runOnJS(moveTheMap)();
    runOnJS(setScore)(0);
  };
  const gesture = Gesture.Tap().onStart(() => {
    if (gameOver.value) {
      //restart game
      restartGame();
    } else {
      birdYVelocity.value = JUMP_FORCE;
    }
  });

  const birdTransform = useDerivedValue(() => {
    return [
      {
        rotate: interpolate(
          birdYVelocity.value,
          [-500, 500],
          [-0.5, 0.5],
          Extrapolate.CLAMP
        ),
      },
    ];
  });

  const birdOrigin = useDerivedValue(() => {
    return { x: width / 4 + 32, y: birdY.value + 24 };
  });

  const fontFamily = Platform.select({ ios: "Helvetica", default: "serif" });

  const fontStyle = {
    fontFamily,
    fontWeight: "600",
    fontSize: 40,
  };
  const font = matchFont(fontStyle);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <Canvas style={{ width, height }}>
          {/* BG */}
          <Image image={bg} fit="cover" width={width} height={height} />

          {/* Pipes */}

          <Image
            image={pipeTop}
            width={pipeWidth}
            height={pipeHeight}
            y={pipeOffset - 320}
            x={x}
          />
          <Image
            image={pipeBottom}
            width={pipeWidth}
            height={pipeHeight}
            y={height - 320 + pipeOffset}
            x={x}
          />

          {/* Base */}

          <Image
            image={base}
            width={width}
            height={150}
            y={height - 75}
            x={0}
            fit={"cover"}
          />

          {/* Bird */}
          <Group transform={birdTransform} origin={birdOrigin}>
            <Image
              image={bird}
              width={64}
              height={48}
              y={birdY}
              x={birdPos.x}
            />
          </Group>
          {/* <Circle cy={birdCenterY} cx={birdCenterX} r={15} color={"red"} /> */}
          {/* Score */}
          <Text x={width / 2 - 30} y={100} text={`${score}`} font={font} />
        </Canvas>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};
export default App;
