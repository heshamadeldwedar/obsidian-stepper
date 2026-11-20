// All shape types in one place. To add a shape: write a file with layer, reach, bounds, draw and overlay, then list it here.
import * as block from './block.js';
import * as crowd from './crowd.js';
import * as db from './db.js';
import * as zone from './zone.js';

export const SHAPE_DRAWERS = { block, crowd, db, zone };
