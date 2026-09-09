# REMNANT: PROTOCOL 66 Model Assets

Place the playable character GLB at:

```text
models/ephesian-remnant.glb
```

The player code loads this file automatically with `GLTFLoader`. If it is missing,
the game falls back to the procedural prototype rig.

## Mixamo Import Path

1. Create or choose a Mixamo character.
2. Download one FBX with skin for the character, then download additional
   animations without skin using the same skeleton.
3. Use Blender to import the character FBX and append the animation FBXs.
4. Rename the animation actions with clear state names:

```text
idle
run
roll
light
heavy
block
parry
heal
stagger
dead
```

5. Export as `glTF 2.0 Binary (.glb)` with animations enabled.
6. Save the exported file as `models/ephesian-remnant.glb`.

The `AnimationController` also accepts common Mixamo-style names such as
`Dodge Roll`, `Sword Slash`, `Heavy Attack`, `Shield Block`, `Shield Bash`,
`Hit Reaction`, and `Death`, but the exact names above are the cleanest path.

## Free Asset Suggestions

Good Mixamo starting points:

- Character: `Paladin`, `Knight`, `Warrior`, or a sci-fi armored character.
- Idle: `Idle` or `Sword And Shield Idle`.
- Movement: `Running` or `Walking`.
- Roll: `Dodge Roll`.
- Light attack: `Sword And Shield Slash`.
- Heavy attack: `Great Sword Slash` or `Standing Melee Attack`.
- Block: `Shield Block`.
- Parry: `Shield Bash`.
- Heal: `Drinking` or `Spellcast`.
- Stagger: `Hit Reaction`.
- Death: `Death From The Front`.

Keep exported files small for GitHub Pages. A single optimized player GLB under
10 MB is a good target.
