import { Chess, Square } from 'chess.js';
import React, {
  useEffect,
  // useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ChessboardState } from '../helpers/get-chessboard-state';
// import { useConst } from '../hooks/use-const';

import { BoardContext, BoardSetterContext } from './board-context';
import {
  BoardOperationsContextProvider,
  BoardOperationsRef,
} from './board-operations-context';
import { BoardPromotionContextProvider } from './board-promotion-context';
import { BoardRefsContextProvider, ChessboardRef } from './board-refs-context';
import { ChessEngineContext } from './chess-engine-context';

type BoardContextProviderProps = {
  fen?: string;
  children?: React.ReactNode;
  onMoveExtension?: (from?: Square, to?: Square) => Boolean;
  handleNewFen?: ({
    newFen,
    lastFen,
    san,
  }: {
    newFen: string;
    lastFen: string;
    san: string;
  }) => void;
  resetChessboard?: Boolean;
  lastFen?: string;
};

const ChessboardContextProviderComponent = React.forwardRef<
  ChessboardRef,
  BoardContextProviderProps
>(
  (
    { children, fen, lastFen, onMoveExtension, handleNewFen, resetChessboard },
    ref
  ) => {
    const chess = new Chess(lastFen || fen);
    const [chessMoveData, setChessMoveData] = useState(chess);
    const chessboardRef = useRef<ChessboardRef>(null);
    const boardOperationsRef = useRef<BoardOperationsRef>(null);

    const [board, setBoard] = useState(chess.board());

    useEffect(() => {
      // if (fen !== chessMoveData?.fen()) {
      const tempFen = lastFen || fen;
      console.log('rerunning', lastFen, fen);
      boardOperationsRef.current?.reset();
      chessboardRef.current?.resetBoard(tempFen);
      const chessTemp = new Chess(tempFen);
      setChessMoveData(chessTemp);
      setBoard(chessTemp.board());
      if (lastFen) {
        setTimeout(() => {
          const currentMove = findMoveFromFens(lastFen, fen);
          if (!currentMove) return;
          console.log(currentMove, 'currentMove');
          chessboardRef.current?.move({
            ...currentMove,
            dontRunOnMoveExtension: true,
          });
        }, 50);
      }
      // }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fen, lastFen, resetChessboard]);

    const chessboardController: ChessboardRef = useMemo(() => {
      return {
        lastFen: lastFen,
        fen: fen,
        move: (params) => chessboardRef.current?.move?.(params),
        undo: () => {
          chessboardRef.current?.undo();
          boardOperationsRef.current?.reset();
        },
        onMoveExtension: onMoveExtension,
        handleNewFen: handleNewFen,
        highlight: (params) => chessboardRef.current?.highlight(params),
        resetAllHighlightedSquares: () =>
          chessboardRef.current?.resetAllHighlightedSquares(),
        getState: () => chessboardRef?.current?.getState() as ChessboardState,
        resetBoard: (params) => {
          chessboardRef.current?.resetBoard(params);
          boardOperationsRef.current?.reset();
        },
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fen, onMoveExtension, handleNewFen]);

    useImperativeHandle(ref, () => chessboardController, [
      chessboardController,
    ]);

    function findMoveFromFens(
      lastMoveFen: string,
      currentMoveFen: string | undefined
    ): { from: Square; to: Square } {
      const chessLast = new Chess(lastMoveFen);
      // const chessCurrent = new Chess(currentMoveFen);

      // Generate all legal moves from the last position
      const moves = chessLast.moves({ verbose: true });
      for (let i = 0; i < moves.length; i++) {
        chessLast.move(moves[i]);
        if (chessLast.fen() === currentMoveFen) {
          // If the FENs match, we found our move
          return { from: moves[i].from, to: moves[i].to };
        }
        chessLast.undo(); // Undo the move to try the next one
      }
      //@ts-ignore
      return null; // If no move leads to the current FEN, return null
    }
    return (
      <BoardContext.Provider value={board}>
        <BoardPromotionContextProvider>
          <ChessEngineContext.Provider value={chessMoveData}>
            <BoardSetterContext.Provider value={setBoard}>
              <BoardRefsContextProvider ref={chessboardRef}>
                <BoardOperationsContextProvider
                  ref={boardOperationsRef}
                  controller={chessboardController}
                >
                  {children}
                </BoardOperationsContextProvider>
              </BoardRefsContextProvider>
            </BoardSetterContext.Provider>
          </ChessEngineContext.Provider>
        </BoardPromotionContextProvider>
      </BoardContext.Provider>
    );
  }
);

const ChessboardContextProvider = React.memo(
  ChessboardContextProviderComponent
);
export {
  ChessboardContextProvider,
  ChessEngineContext,
  BoardContext,
  BoardSetterContext,
};
