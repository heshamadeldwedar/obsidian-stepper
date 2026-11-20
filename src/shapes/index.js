// All shape types in one place. To add a shape: write a file with layer, reach, bounds, draw and overlay,
// add its defaults to SHAPES in lesson.js, then list it here.
import * as block from './block.js';
import * as crowd from './crowd.js';
import * as db from './db.js';
import * as zone from './zone.js';
import * as queue from './queue.js';
import * as device from './device.js';
import * as ghost from './ghost.js';
import * as ring from './ring.js';

export const SHAPE_DRAWERS = { block, crowd, db, zone, queue, device, ghost, ring };
