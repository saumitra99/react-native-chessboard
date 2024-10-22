import type { PieceType, Square } from 'chess.js';
import React, {
  createContext,
  useCallback,
  // useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import type Animated from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';
import { getChessboardState } from '../../helpers/get-chessboard-state';
import { useReversePiecePosition } from '../../notation';
import { useSetBoard } from '../board-context/hooks';
import { useBoardPromotion } from '../board-promotion-context/hooks';
import type { ChessboardRef } from '../board-refs-context';
import { usePieceRefs } from '../board-refs-context/hooks';
import { useChessEngine } from '../chess-engine-context/hooks';
import { useChessboardProps } from '../props-context/hooks';
import * as Haptics from 'expo-haptics';
import useSound from 'use-sound';

const moveSoundUrl =
  'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3';

type BoardOperationsContextType = {
  selectableSquares: Animated.SharedValue<Square[]>;
  onMove: (from: Square, to: Square) => void;
  onSelectPiece: (square: Square) => void;
  undo: () => void;
  resetAllHighlightedSquares: () => void;
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
  moveTo: (to: Square) => void;
  isPromoting: (from: Square, to: Square) => boolean;
  selectedSquare: Animated.SharedValue<Square | null>;
  turn: Animated.SharedValue<'w' | 'b'>;
};

const BoardOperationsContext = createContext<BoardOperationsContextType>(
  {} as any
);

export type BoardOperationsRef = {
  reset: () => void;
};

const BoardOperationsContextProviderComponent = React.forwardRef<
  BoardOperationsRef,
  { controller?: ChessboardRef; children?: React.ReactNode }
>(({ children, controller }, ref) => {
  const chess = useChessEngine();
  const onMoveExtension = controller?.onMoveExtension;
  const handleNewFen = controller?.handleNewFen;
  const setBoard = useSetBoard();
  const {
    pieceSize,
    disable,
    onMove: onChessboardMoveCallback,
    colors: { checkmateHighlight },
  } = useChessboardProps();
  const { toTranslation } = useReversePiecePosition();
  const selectableSquares = useSharedValue<Square[]>([]);
  const selectedSquare = useSharedValue<Square | null>(null);
  const { showPromotionDialog } = useBoardPromotion();
  const pieceRefs = usePieceRefs();

  const turn = useSharedValue(chess.turn());

  // useEffect(() => {
  //   if (controller?.lastFen) {
  //     const lastMove = findMoveFromFens(controller?.lastFen, controller?.fen);
  //     console.log(
  //       controller?.lastFen,
  //       controller?.fen,
  //       lastMove,
  //       'lastMove new'
  //     );
  //     //@ts-ignore
  //     onMove(lastMove);
  //     // controller?.highlight({
  //     //   square: lastMove?.from,
  //     //   color: checkmateHighlight,
  //     // });
  //     // controller.highlight
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [controller?.lastFen, controller?.fen]);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        selectableSquares.value = [];
        controller?.resetAllHighlightedSquares();
        turn.value = chess.turn();
      },
    }),
    [chess, controller, selectableSquares, turn]
  );

  const isPromoting = useCallback(
    (from: Square, to: Square) => {
      if (!to.includes('8') && !to.includes('1')) return false;

      const val = toTranslation(from);
      const x = Math.floor(val.x / pieceSize);
      const y = Math.floor(val.y / pieceSize);
      const piece = chess.board()[y][x];

      return (
        piece?.type === chess.PAWN &&
        ((to.includes('8') && piece.color === chess.WHITE) ||
          (to.includes('1') && piece.color === chess.BLACK))
      );
    },
    [chess, pieceSize, toTranslation]
  );

  const findKing = useCallback(
    (type: 'wk' | 'bk') => {
      const board = chess.board();
      for (let x = 0; x < board.length; x++) {
        const row = board[x];
        for (let y = 0; y < row.length; y++) {
          const col = String.fromCharCode(97 + Math.round(x));

          const row = `${8 - Math.round(y)}`;
          const square = `${col}${row}` as Square;

          const piece = chess.get(square);
          if (piece?.color === type.charAt(0) && piece.type === type.charAt(1))
            return square;
        }
      }
      return null;
    },
    [chess]
  );

  const moveProgrammatically = useCallback(
    (from: Square, to: Square, promotionPiece?: PieceType) => {
      let move: any = null;
      try {
        move = chess.move({
          from,
          to,
          promotion: promotionPiece as any,
        });
      } catch (err) {
        return;
      }

      turn.value = chess.turn();

      if (move == null) return;

      const isCheckmate = chess.in_checkmate();

      if (isCheckmate) {
        const square = findKing(chess.turn() === 'b' ? 'bk' : 'wk');
        if (!square) return;
        controller?.highlight({ square, color: checkmateHighlight });
      }

      onChessboardMoveCallback?.({
        move,
        state: {
          ...getChessboardState(chess),
          in_promotion: promotionPiece != null,
        },
      });

      setBoard(chess.board());
    },
    [
      checkmateHighlight,
      chess,
      controller,
      findKing,
      onChessboardMoveCallback,
      setBoard,
      turn,
    ]
  );

  const [playMoveSound] = useSound(moveSoundUrl);

  const onMove = useCallback(
    (from: Square, to: Square) => {
      try {
        if (disable) return;
        selectableSquares.value = [];
        selectedSquare.value = null;
        const lastMove = { from, to };
        controller?.resetAllHighlightedSquares();
        controller?.highlight({ square: lastMove.from });
        controller?.highlight({ square: lastMove.to });

        const in_promotion = isPromoting(from, to);
        if (!in_promotion) {
          moveProgrammatically(from, to);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          playMoveSound();
          return;
        }

        pieceRefs?.current?.[to]?.current?.enable(false);
        showPromotionDialog({
          type: chess.turn(),
          onSelect: (piece) => {
            moveProgrammatically(from, to, piece);
            pieceRefs?.current?.[to]?.current?.enable(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            playMoveSound();
          },
        });
      } catch (error) {
        console.log(error, 'error while moving');
      }
    },
    [
      selectableSquares,
      selectedSquare,
      controller,
      isPromoting,
      pieceRefs,
      disable,
      showPromotionDialog,
      chess,
      moveProgrammatically,
      playMoveSound,
    ]
  );

  const onSelectPiece = useCallback(
    (square: Square) => {
      selectedSquare.value = square;

      const validSquares = (chess.moves({ square }) ?? []) as Square[];

      selectableSquares.value = validSquares.map((square) => {
        if (square.toString() == 'O-O') {
          return chess.turn() === 'w' ? 'g1' : 'g8';
        } else if (square.toString() == 'O-O-O') {
          return chess.turn() === 'w' ? 'c1' : 'c8';
        }
        const splittedSquare = square.split('x');
        return splittedSquare.length === 0
          ? square
          : (splittedSquare[splittedSquare.length - 1] as Square);
      });
    },
    [chess, selectableSquares, selectedSquare]
  );

  const moveTo = useCallback(
    (to: Square) => {
      if (selectedSquare.value != null) {
        controller?.move({ from: selectedSquare.value, to });
        return true;
      }
      return false;
    },
    [controller, selectedSquare.value]
  );

  const value = useMemo(
    () => ({
      onMove,
      onSelectPiece,
      moveTo,
      selectableSquares,
      selectedSquare,
      isPromoting,
      turn,
      onMoveExtension,
      handleNewFen,
      undo: controller?.undo ?? (() => {}),
      resetAllHighlightedSquares:
        controller?.resetAllHighlightedSquares ?? (() => {}),
    }),
    [
      isPromoting,
      moveTo,
      onMove,
      onSelectPiece,
      selectableSquares,
      selectedSquare,
      turn,
      onMoveExtension,
      handleNewFen,
      controller,
    ]
  );

  return (
    <BoardOperationsContext.Provider value={value}>
      {children}
    </BoardOperationsContext.Provider>
  );
});

const BoardOperationsContextProvider = React.memo(
  BoardOperationsContextProviderComponent
);

export { BoardOperationsContextProvider, BoardOperationsContext };
