import React, { useImperativeHandle, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

import Background from './components/chessboard-background';
import { HighlightedSquares } from './components/highlighted-squares';
import { Pieces } from './components/pieces';
import { SuggestedDots } from './components/suggested-dots';
import { ChessboardContextProvider } from './context/board-context-provider';
import type { ChessboardRef } from './context/board-refs-context';
import {
  ChessboardProps,
  ChessboardPropsContextProvider,
} from './context/props-context';
import { useChessboardProps } from './context/props-context/hooks';
import type { ChessboardState } from './helpers/get-chessboard-state';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PIECES } from './constants';

const styles = StyleSheet.create({
  container: {
    aspectRatio: 1,
  },
});

const Chessboard = React.memo(() => {
  const { boardSize } = useChessboardProps();
  // const chessboardRef = useRef<ChessboardRef>(null);

  return (
    <View style={[styles.container, { width: boardSize }]}>
      <Background />
      <Pieces />
      <HighlightedSquares />
      <SuggestedDots />
    </View>
  );
});

const ChessboardContainerComponent = React.forwardRef<
  ChessboardRef,
  ChessboardProps
>((props, ref) => {
  const chessboardRef = useRef<ChessboardRef>(null);

  if (props?.disable) {
    console.log(props?.disable, 'disable');
    props.gestureEnabled = true;
  }

  useImperativeHandle(
    ref,
    () => ({
      move: (params) => chessboardRef.current?.move?.(params),
      undo: () => chessboardRef.current?.undo(),
      onMoveExtension: props?.onPieceDropExtension
        ? props?.onPieceDropExtension
        : () => {
            return false;
          },
      // handleNewFen:({newFen,lastFen,san}:{newFen:string,lastFen:string,san:string})=>void,
      //@ts-ignore
      handleNewFen: props?.handleNewFen,
      highlight: (params) => chessboardRef.current?.highlight(params),
      resetAllHighlightedSquares: () =>
        chessboardRef.current?.resetAllHighlightedSquares(),
      getState: () => chessboardRef?.current?.getState() as ChessboardState,
      resetBoard: (params) => chessboardRef.current?.resetBoard(params),
    }),
    [props?.onPieceDropExtension, props?.handleNewFen]
  );

  return (
    <GestureHandlerRootView>
      {console.log('rerendering')}
      <ChessboardPropsContextProvider {...props}>
        <ChessboardContextProvider
          ref={chessboardRef}
          fen={props.fen || props.position}
          onMoveExtension={props?.onPieceDropExtension}
          handleNewFen={props?.handleNewFen}
          // handleNewFen:({newFen,lastFen,san}:{newFen:string,lastFen:string,san:string})=>void,

          resetChessboard={props.resetChessboard}
          lastFen={props.lastMoveFen}
        >
          <Chessboard />
        </ChessboardContextProvider>
      </ChessboardPropsContextProvider>
    </GestureHandlerRootView>
  );
});

const ChessboardContainer = React.memo(ChessboardContainerComponent);

export type { ChessboardRef };
export const PieceImages = PIECES;
export default ChessboardContainer;
