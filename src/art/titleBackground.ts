// The title screen backdrop (240x160): sunset sky bands, the sun, two mountain ranges, the town skyline,
// and Main Street at dusk. The paths are copied from the SVG in docs/mocks/Main.dc.html, back to front.
import type { Layer } from './paint.ts';
import { rectPath } from './svgPath.ts';

export const TITLE_BACKGROUND: Layer[] = [
    { color: 'duskTop', path: rectPath(0, 0, 240, 30) },
    { color: 'duskHigh', path: rectPath(0, 30, 240, 18) },
    { color: 'duskMid', path: rectPath(0, 48, 240, 14) },
    { color: 'duskLow', path: rectPath(0, 62, 240, 12) },
    { color: 'duskGlow', path: rectPath(0, 74, 240, 40) },
    {
        color: 'cream',
        path: 'M12 6h1v1h-1z M40 14h1v1h-1z M70 4h1v1h-1z M102 10h1v1h-1z M188 8h1v1h-1z M214 18h1v1h-1z M226 5h1v1h-1z M160 16h1v1h-1z M130 3h1v1h-1z M24 22h1v1h-1z'
    },
    { color: 'sunlight', path: 'M196 58h12v2h-12z M193 60h18v2h-18z M191 62h22v2h-22z M190 64h24v12h-24z' },
    {
        color: 'mountainFar',
        path: 'M0 104V84h12v-4h12v-4h12v-4h12v-4h8v-4h12v-4h8v4h12v4h12v4h16v4h12v-4h12v-4h12v4h12v4h16v4h16v-4h12v-4h12v4h12v4h8v24z'
    },
    {
        color: 'mountainNear',
        path: 'M0 110V96h10v-4h8v-4h6v-6h6v-6h4v-6h6v4h4v6h6v6h10v4h12v4h16v2h20v-2h16v-2h20v2h24v2h20v-2h18v2h14v2h20v14z'
    },
    { color: 'mountainMist', path: 'M34 70h6v2h-6z M30 76h4v2h-4z M44 80h2v2h-2z' },
    {
        color: 'treeline',
        path: 'M0 104h4v-2h6v2h4v-3h6v3h6v-2h6v2h4v-3h8v3h6v-2h6v2h8v-3h6v3h6v-2h6v2h4v-3h6v3h8v-2h6v2h6v-3h6v3h6v-2h6v2h4v-3h8v3h6v-2h6v2h6v-3h6v3h6v-2h6v2h6v-3h6v3h6v-2h4v2h6v2h28V112H0z'
    },
    {
        color: 'skyline',
        path: 'M22 128V100h16v28z M27 100V88h6v12z M44 128V104h26v24z M70 128V108h22v20z M96 128V100h32v28z M132 128V102h38v26z M172 128V106h28v22z M204 128V100h32v28z'
    },
    { color: 'skyline', path: 'M27 88l3-22l3 22z' },
    {
        color: 'gold',
        path: 'M48 108h2v3h-2z M54 108h2v3h-2z M60 108h2v3h-2z M48 116h2v3h-2z M60 116h2v3h-2z M100 104h3v3h-3z M108 104h3v3h-3z M116 104h3v3h-3z M100 112h3v3h-3z M116 112h3v3h-3z M176 110h2v3h-2z M184 110h2v3h-2z M192 110h2v3h-2z M208 104h3v3h-3z M216 104h3v3h-3z M224 104h3v3h-3z M216 112h3v3h-3z M74 112h2v3h-2z M84 112h2v3h-2z M29 92h2v3h-2z M25 106h2v4h-2z M33 106h2v4h-2z'
    },
    { color: 'awning', path: rectPath(138, 106, 26, 6) },
    { color: 'sunlight', path: 'M139 105h1v1h-1z M143 105h1v1h-1z M147 105h1v1h-1z M151 105h1v1h-1z M155 105h1v1h-1z M159 105h1v1h-1z M163 105h1v1h-1z' },
    { color: 'amber', path: rectPath(146, 118, 10, 10) },
    { color: 'lawn', path: rectPath(0, 128, 240, 32) },
    { color: 'curb', path: rectPath(0, 128, 240, 6) },
    { color: 'asphaltDusk', path: rectPath(0, 134, 240, 14) },
    {
        color: 'laneLine',
        path: 'M4 140h8v1h-8z M24 140h8v1h-8z M44 140h8v1h-8z M64 140h8v1h-8z M84 140h8v1h-8z M104 140h8v1h-8z M124 140h8v1h-8z M144 140h8v1h-8z M164 140h8v1h-8z M184 140h8v1h-8z M204 140h8v1h-8z M224 140h8v1h-8z'
    },
    { color: 'ink', path: 'M36 116h1v12h-1z M116 116h1v12h-1z M196 116h1v12h-1z' },
    { color: 'gold', path: 'M34 113h5v3h-5z M114 113h5v3h-5z M194 113h5v3h-5z' },
    { color: 'lawnDark', path: rectPath(0, 148, 240, 12) }
];
