// The lesson the preview page shows. Same shape as the YAML, written as a JS object.
export const EXAMPLE = {
  title: 'Will one server do?',
  steps: [
    {
      title: 'The question',
      scene: {
        users: { type: 'crowd', at: [-2, -8], label: '10M daily users' },
        s0: { type: 'block', at: [0, 6], label: ['One', 'server?'], cpu: 0.8 },
      },
      links: { u: { from: 'users', to: 's0', label: 'HTTPS' } },
    },
    {
      title: 'Ten servers',
      scene: {
        s0: null,
        web: { type: 'zone', at: [1, 6], w: 9, d: 9, label: 'Web tier · 4 servers' },
        a: { type: 'block', at: [-1, 4], s: 2.8, h: 34 },
        b: { type: 'block', at: [3, 4], s: 2.8, h: 34 },
        c: { type: 'block', at: [-1, 8], s: 2.8, h: 34 },
        d: { type: 'block', at: [3, 8], s: 2.8, h: 34, heat: 1, cpu: 1 },
        db1: { type: 'db', at: [11, 4], label: 'Mongo' },
        cdn: { type: 'block', at: [6, -6], color: 'green', glyph: 'globe', label: ['CDN'] },
      },
      links: {
        u: { from: 'users', to: 'a', label: '' },
        w: { from: 'b', to: 'db1', heads: 'both' },
        c: { from: 'cdn', to: 'users', style: 'dashed', label: 'images' },
        x: { from: 'd', to: 'db1', via: [[8, 9]], style: 'cut' },
      },
    },
  ],
};
