// Every shape type on one stage, for checking the drawing. Open dev/preview.html?gallery=1
// `spot(column, row)` turns a screen grid position into floor coordinates, so shapes don't overlap.
const spot = (column, row) => { const X = column * 120, Y = row * 95; return [(X / 14 + Y / 7) / 2, (X / 14 - Y / 7) / 2]; };

export const GALLERY = {
  title: 'Shape gallery',
  legend: ['req', 'res', 'msg', 'write', 'heavy', 'ping', 'fail'],
  steps: [{
    title: 'All shapes',
    text: 'Every shape type, link style and dot kind on one stage.',
    scene: {
      users: { type: 'crowd', at: spot(-2, 0), w: 5, d: 4, count: 10, label: 'crowd' },
      lap: { type: 'device', at: spot(-2, -1.2), label: 'device' },
      phone: { type: 'device', kind: 'phone', at: spot(-2, 1.2), label: 'phone', tags: [{ text: 'Bob', tone: 'green', icon: 'user' }] },
      api: { type: 'block', at: spot(0, 0), label: ['block'], cpu: 0.45 },
      hot: { type: 'block', at: spot(0, -1.3), label: ['heat 1'], heat: 1, cpu: 0.97 },
      down: { type: 'block', at: spot(2, -1.3), label: ['dead 1'], dead: 1 },
      plan: { type: 'ghost', at: spot(2, 1.3), label: ['ghost'] },
      store: { type: 'db', at: spot(2, 0), label: 'db' },
      jobs: { type: 'queue', at: spot(0, 1.25), n: 6, dir: [1, 1], label: 'queue' },
      hash: { type: 'ring', at: spot(4, 0.2), r: 3, n: 6, label: 'ring' },
      region: { type: 'zone', at: spot(4, -1.2), w: 6, d: 5, label: 'zone' },
    },
    links: {
      a: { from: 'users', to: 'api', label: 'solid' },
      c: { from: 'api', to: 'store', style: 'dashed', heads: 'both', label: 'dashed' },
      d: { from: 'hot', to: 'down', style: 'cut', label: 'cut' },
      e: { from: 'phone', to: 'api', style: 'beat' },
      f: { from: 'jobs', to: 'api', style: 'off' },
      g: { from: 'lap', to: 'hot', heads: 'none' },
    },
    flows: [
      { route: ['a'], rate: 3, fail: 0.3 }, { route: ['c'], rate: 1.5, kind: 'write', bounce: true },
      { route: ['e'], rate: 1, kind: 'ping' }, { route: ['f'], rate: 1.5, kind: 'msg', reverse: true }, { route: ['g'], rate: 1, kind: 'heavy' },
    ],
  }],
};
