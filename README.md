# Isma Plugins

The home page of Isma's two Premiere Pro plugins, on one screen split in two:
Khanjar on the left (black, fire, the dagger), Isma Organizer on the right (Frutiger Aero sky).

A static page, no build step: `index.html`, `style.css`, `scene.js` (the 3D layer, Three.js 0.169 from a CDN)
and `shared/dagger.js` (the Khanjar dagger, the same as on its site).

Direction C ("nuit / jour"): `scene.js` draws one landscape across the whole width, from Khanjar's night to
Isma Organizer's day, with a real dusk between them (a sunset glow on the horizon) that follows the mouse. The page opens
on one night, then the dawn sweeps in from the right (a short version on a second visit). Its pieces are in `world/`
(the sky, the ground, the dagger's stone, the embers and bubbles, the sun's flare). Without WebGL the two CSS worlds stay.

Run it locally: `python3 -m http.server 8770` in this folder, then open http://localhost:8770.
