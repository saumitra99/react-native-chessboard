import type { PiecesType } from './types';

const PIECES: PiecesType = {
  br: require('./assets/circlechess-pieces-pgn/br.png'),
  bp: require('./assets/circlechess-pieces-pgn/bp.png'),
  bn: require('./assets/circlechess-pieces-pgn/bn.png'),
  bb: require('./assets/circlechess-pieces-pgn/bb.png'),
  bq: require('./assets/circlechess-pieces-pgn/bq.png'),
  bk: require('./assets/circlechess-pieces-pgn/bk.png'),
  wr: require('./assets/circlechess-pieces-pgn/wr.png'),
  wn: require('./assets/circlechess-pieces-pgn/wn.png'),
  wb: require('./assets/circlechess-pieces-pgn/wb.png'),
  wq: require('./assets/circlechess-pieces-pgn/wq.png'),
  wk: require('./assets/circlechess-pieces-pgn/wk.png'),
  wp: require('./assets/circlechess-pieces-pgn/wp.png'),
};

const assets = Object.values(PIECES);

export { assets, PIECES };
