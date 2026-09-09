# REMNANT: PROTOCOL 66
## 3D Souls-Like Action RPG — Master Game Design & Art Direction Bible (GDD / TDD)

---

## 1. Executive Summary & Vision

- **Title**: *REMNANT: PROTOCOL 66*
- **Genre**: 3D Cyber-Gothic Souls-Like Action RPG
- **Target Platform**: Modern Desktop Web Browsers (WebGL via Three.js / HTML5 / Modular ES6 JavaScript)
- **Engine Stack**: Three.js (r128+), Web Audio API, Kinematic Capsule + Octree Spatial Partitioning
- **Tone & Themes**: Eschatological Cyberpunk, Patmos Cosmic Horror, Christian Remnant Underground, World Mythological Syncretism
- **Key References**: *Dark Souls*, *Bloodborne*, *Lies of P*, *Sekiro: Shadows Die Twice*, *Blade Runner 2049*

### The Pitch
In the late 21st century, following a devastating global cataclysm, the **Pax Pantheon**—a hyper-technocratic ecumenical regime led by the Beast system—has unified all world religions, pagan mythologies, and astrological pantheons into a centralized neural hive known as **The Accord**. Humanity is chipped with the **Neural Mark of the Beast**, turning billions into compliant thralls ("The Deceived").

You are an **Ephesian Remnant**, a faithful dissident warrior operating from the catacombs beneath Neo-Babylon. Equipped with prototype pneumatic sacred bio-armor—the **Panoply of God** (Ephesians 6:10–18)—and armed with the **Sword of the Spirit**, you ascend through the neon-drenched spires of the megacity to confront the seven regional demonic Archons (dark princes) and break the chains binding humanity's soul.

---

## 2. Core Gameplay Mechanics & Mathematical Specifications

### 2.1 Character State Machine
The player operates under a rigid, frame-buffered state machine running at a locked tick rate (normalized to 60 FPS delta $\Delta t$):

```
                       ┌─────────────┐
                       │    IDLE     │◄───────────────────┐
                       └──────┬──────┘                    │
                              │ (WASD)                    │
                              ▼                           │
                       ┌─────────────┐                    │
                       │ WALK / RUN  │                    │
                       └──────┬──────┘                    │
           ┌──────────────────┼──────────────────┐        │
           ▼                  ▼                  ▼        │
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
    │ DODGE ROLL  │    │ LIGHT ATK   │    │ BLOCK/PARRY │ │
    │  (iFrames)  │    │  (1 & 2)    │    │ (Window)    │ │
    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘ │
           │                  ▼                  │        │
           │           ┌─────────────┐           │        │
           │           │ HEAVY CHARGE│           │        │
           │           └──────┬──────┘           │        │
           │                  │                  │        │
           └──────────────────┼──────────────────┘        │
                              ▼                           │
                       ┌─────────────┐                    │
                       │ STANCE BREAK│                    │
                       │  / RIPOSTE  │────────────────────┘
                       └─────────────┘
```

- **Input Buffer**: 10 frames (~166 ms). Any attack or dodge input pressed during recovery frames of a previous animation is stored and automatically dispatched on the first actionable exit frame.
- **Action Cancellation**: Rolls can cancel recovery frames of Light Attacks at frame 18+, but cannot cancel active swing frames (preventing reckless spamming).

---

### 2.2 Equipment Load, Agility Tiers & iFrames

The weight of all equipped weapons and armor directly governs combat mobility, stamina regeneration, and invulnerability:

$$\text{Equip Load Ratio} = \frac{\sum \text{Equipped Weight (kg)}}{\text{Max Equipment Load (kg)}}$$

| Tier | Equip Load % | iFrames (at 60 FPS) | Invulnerability Duration | Roll Distance | Stamina Regen Rate | Roll Recovery Time | Animation Feel |
|---|---|---|---|---|---|---|---|
| **Light Roll** | $< 30\%$ | **14 frames** | $233\text{ ms}$ (frames 2–15) | $6.2\text{ m}$ | $54\text{ stam/sec}$ ($+20\%$) | 8 frames | Nimble low-profile dive & slide |
| **Medium Roll** | $30\% - 70\%$ | **11 frames** | $183\text{ ms}$ (frames 3–13) | $4.8\text{ m}$ | $45\text{ stam/sec}$ (Base) | 12 frames | Standard combat tuck-and-roll |
| **Fat Roll** | $70\% - 100\%$ | **7 frames** | $116\text{ ms}$ (frames 4–10) | $3.2\text{ m}$ | $31\text{ stam/sec}$ ($-30\%$) | 22 frames | Heavy metallic slam, staggered recovery |
| **Overburdened** | $> 100\%$ | **0 frames** | $0\text{ ms}$ | $0.0\text{ m}$ | $18\text{ stam/sec}$ ($-60\%$) | 30 frames | Stumble forward, cannot dodge |

---

### 2.3 Shield Block & Timed Deflection (Parry System)

#### Normal Guard (Hold RMB)
- **Damage Negation**: $100\%$ Physical, $75\%$ Elemental / Energy.
- **Stamina Drain on Impact**:
  $$\text{Stamina Cost} = \text{Incoming Damage} \times (1 - \text{Shield Stability}) \quad (\text{Stability} = 0.70)$$
- **Guard Break**: If stamina reaches $0$ while absorbing a hit, the player is thrown backward into a **Guard Broken Stagger** for $2.4\text{ seconds}$, taking $+50\%$ critical damage on subsequent hits.

#### Timed Deflection / Parry (Press Q or Tap RMB within window)
- **Timeline at 60 FPS**:
  - **Frames 1–3**: Startup (shield begins raising; vulnerable).
  - **Frames 4–9**: **Active Parry Window (6 frames / 100 ms)**.
  - **Frames 10–24**: Recovery (shield sweeps outward; highly vulnerable to counter-attacks).
- **On Successful Parry**:
  1. Incoming damage negated to **0**.
  2. Zero stamina consumed.
  3. **Visual Punch**: Camera zooms FOV $60^\circ \rightarrow 52^\circ$ for $0.15\text{s}$; radial chromatic aberration flash; golden particle shockwave explodes from the contact point.
  4. **Audio Cue**: Instant high-frequency deflecting gong (`sound.playParry()`).
  5. **Target Reaction**: Attacking enemy has their swing rebounded and enters **Stance Broken State** for $3.5\text{ seconds}$ (signaled by a high-pitched ringing and a golden reticle on their chest).

---

### 2.4 Signature Mechanic: "Deliverance vs. Execution" (Convert the Lost)

Human cultists and enforcers are victims of the neural mark. When their poise is broken or they are parried, the player stands before them and has two divergent paths:

```
                  ┌───────────────────────────────┐
                  │    ENEMY STANCE BROKEN        │
                  │ (Vulnerable Kneeling State)   │
                  └──────────────┬────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
      [F] DELIVERANCE / CONVERT         [LMB] VISCERAL EXECUTE
      ─────────────────────────         ──────────────────────
      - Channels Holy Prayer            - High-frequency blade thrust
      - Neural mark dissolves           - Instant fatal mechanical damage
      - Enemy collapses, cleansed       - Enemy destroyed
      - Grants +120 Grace               - Grants +50 Grace
      - Restores +1 Communion Flask     - Drops +2 Cyber-Scrap (Upgrades)
      - Soul joins Remnant Camp         - No moral conversion
```

---

### 2.5 Character Progression & Sanctuary Altar Leveling

At the **Holy Sanctuary Altars** (bonfires of the Remnant), the player spends **Grace** (souls currency) to level attributes:

| Attribute | Base | Scaling per Point | Gameplay Impact |
|---|---|---|---|
| **Vigor (VIG)** | 10 | $+24\text{ Max HP}$ | Survivability against high-damage boss combos |
| **Endurance (END)** | 10 | $+6\text{ Max Stamina}$, $+1.8\text{ kg Max Equip Load}$ | Enables heavier armor while staying in Light/Medium roll |
| **Faith (FTH)** | 10 | $+4.5\%$ Sacred Damage scaling | Powers the *Sword of the Spirit* and Prayer incantations |
| **Fortitude (FOR)** | 10 | $+0.8\%$ Physical Armor, $+2.0\text{ Poise}$ | Prevents being staggered during light enemy swings (Hyper-Armor) |
| **Discernment (DIS)** | 10 | $+0.1\text{ frames active parry window}$ (per 2 pts) | Increases timing forgiveness on deflections & item discovery |

$$\text{Grace Required for Level } (L) = \lfloor 0.04L^3 + 0.8L^2 + 2L + 80 \rfloor$$

---

## 3. The Ephesian Panoply: Equipment & Itemization

All equipment reflects the scripture of **Ephesians 6:10–18**:

```
[Helmet of Salvation]   ─── Head (Weight: 3.5 kg)  ─── HUD, enemy poise meter, parry guide
[Breastplate of Right.] ─── Torso (Weight: 14.0 kg) ─── High Poise hyper-armor, kinetic plating
[Belt of Truth]         ─── Waist (Weight: 2.0 kg)  ─── Stamina recovery conduit (+15% regen)
[Greaves of Peace]      ─── Legs (Weight: 6.5 kg)   ─── Quickstep traction, reduces roll stam cost
[Shield of Faith]       ─── Off-Hand (Weight: 5.0 kg) ─ Hard-light barrier, deflection parry
[Sword of the Spirit]   ─── Main-Hand (Weight: 4.0 kg) ─ High-frequency plasma blade, holy scaling
─────────────────────────────────────────────────────────────────────────────────────────────
Total Base Load: 35.0 kg / Max Load (at 10 END): 53.0 kg  ─── Equip Load: 66.0% (Medium Roll)
```

- If the player un-equips the *Breastplate of Righteousness* (lowering total weight to $21.0\text{ kg}$), Equip Load drops to $39.6\%$. Further dropping the heavy shield brings it $< 30\%$ into **Light Roll** tier!
- Players can find alternate heavy cyber-armor (*Mark of Iron*, $26.0\text{ kg}$) that pushes them into **Fat Roll** tier, granting massive poise at the expense of mobility.

---

## 4. Art Direction & Visual Style Guide

### 4.1 Visual Theme: "Cyber-Gothic Eschatology"
The aesthetic bridges cold, rain-soaked brutalist cyberpunk with towering gothic ecclesiastical architecture:
- Crumbling ribbed stone vaults interlinked with glowing bundles of thick fiber-optic arterial cables.
- Holographic stained-glass rose windows cycling through synthetic zodiac constellations and false-prophet ecumenical sigils.
- Sacred holy light is **warm, incandescent amber and pure white-gold**, cutting through the suffocating **deep indigo, cyan neon, and blood-crimson** pollution of the Beast's megacity.

### 4.2 Curated Color Palette

```
[#0D0F14] Void Obsidian     ─── Primary world stone, cathedral masonry, wet asphalt
[#1A2238] Midnight Chasm    ─── Volumetric ambient shadows and skybox fog
[#FF2A5F] Mark of the Beast ─── Crimson glow on cultist visors, unblockable boss attacks, false idols
[#00F2FE] Syncretic Cyan    ─── Neural cables, holographic projections, barrier shields
[#FFD700] Incandescent Gold ─── Sword of the Spirit, Shield of Faith, grace orbs, parry sparks
[#FFF8E7] Holy Purity White ─── Deliverance prayer beams, altar candles, sanctuary glow
```

### 4.3 Three.js Material & Lighting Specifications
To achieve a high-end Souls atmosphere in Three.js:
1. **Renderer**:
   ```javascript
   renderer.toneMapping = THREE.ACESFilmicToneMapping;
   renderer.toneMappingExposure = 1.1;
   renderer.outputEncoding = THREE.sRGBEncoding;
   renderer.shadowMap.enabled = true;
   renderer.shadowMap.type = THREE.PCFSoftShadowMap;
   ```
2. **Atmospheric Fog**:
   ```javascript
   scene.fog = new THREE.FogExp2(0x0a0c14, 0.022); // Dense, brooding distance occlusion
   ```
3. **Materials**:
   - Armor & Weapons: `MeshStandardMaterial({ metalness: 0.85, roughness: 0.25 })` with subtle normal map noise.
   - Sacred Blade: Emissive glow using `emissive: 0xffd700, emissiveIntensity: 2.2`.
   - Wet Marble Floor: `roughness: 0.15, metalness: 0.1` to catch dynamic reflections from neon lights.

---

## 5. Pilot Level Walkthrough: "Cathedral of the False Light — Sector 7"

```
                              [LEVEL FLOWCHART]

   [SPAWN]
      │
      ▼
┌──────────────────────────────┐
│  Area 1: Courtyard of Blind  │ ─── Teaches: Movement, Sprint, Camera Orbit,
│                              │              and Dodging through laser tripwires.
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Area 2: Cloister of the Mark │ ─── Teaches: Light attack combo, Deceived Cultist,
│                              │              Poise break, Deliverance (F) vs Execute.
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Area 3: The Vestry Sanctuary │ ─── CHECKPOINT: Holy Altar discovered. Spend Grace,
│          (Safe Haven)        │     level stats, adjust inventory loadout.
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Area 4: Nave of Syncretism   │ ─── Teaches: Enforcer of the Mark (Shield Sentinel),
│                              │              Timed Parry deflection, Guard Breaking.
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Area 5: The Eclipse Sanctum  │ ─── BOSS FIGHT: Prince Rahu-Ketu (Herald of Eclipse).
│         (Boss Arena)         │     Phase 1 (Blades) ──► Phase 2 (Techno-Eclipse).
└──────────────────────────────┘
```

### Step-by-Step Encounter Design

#### Area 1: Courtyard of the Blind
- **Atmosphere**: Pouring digital rain under a smog-choked neon skyline. Crumbling gothic statues wrapped in glowing yellow bio-hazard caution tape.
- **Player Objectives**: Master WASD navigation, camera orbit, sprinting across a collapsing stone bridge, and dodge rolling under high-voltage laser tripwires.
- **Tutorial Prompts**:
  - `[SPACE]`: Dodge Roll (iFrames grant invulnerability through lasers).
  - `[SHIFT]`: Sprint (drains stamina).

#### Area 2: Cloister of the Mark
- **Encounter**: 2x **Deceived Initiates** armed with stun-batons.
- **Combat Flow**: The initiates lunge with wide, erratic swings. Player practices locking on (`[TAB]`), circling, and executing 2-hit light attacks (`[LMB]`).
- **First Moral Choice**: On breaking their poise, a tutorial banner appears:
  - *"Press [F] to Exorcise & Convert (Restores Flask + Grants Grace)"*
  - *"Press [LMB] to Execute (Yields Cyber-Scrap)"*

#### Area 3: The Vestry Sanctuary (Checkpoint)
- **Atmosphere**: A quiet, candlelit chamber sheltered from the digital rain. A golden cross made of incandescent fiber optics hums softly on the altar.
- **Interactions**:
  - `[E] Commune with Altar`: Fully heals HP/Stamina, refills Communion Flasks, respawns world enemies, and opens the **Level Up Screen** (spend Grace to increase Vigor, Endurance, Faith, Fortitude, Discernment).
  - `[I] Inventory`: Swap gear to test how weight shifts you between Light, Medium, and Fat roll.

#### Area 4: The Great Nave of Syncretism
- **Encounter**: 1x **Enforcer of the Mark** (Elite Sentinel with a riot energy-shield and electro-lance) accompanied by 1x Deceived Initiate.
- **Combat Flow**: The Enforcer turtle-guards behind his shield. Regular attacks bounce off. The player must either:
  1. Wait for his telegraphed thrust, tap `[Q]` at frame 4 to execute a **Timed Parry**, shattering his guard for a visceral Riposte.
  2. Or unleash a **Charged Heavy Attack** (`Hold LMB`) to break his shield guard directly.

#### Area 5: The Eclipse Sanctum (Boss Arena)
- A vast, octagonal cathedral choir flanked by towering holographic stained-glass windows displaying the Vedic Rahu serpent entwined with high-tech circuitry.
- Golden eclipse mandalas rotate slowly on the marble floor. At the far end stands **Prince Rahu-Ketu**, hovering motionless in deep cyber-meditation until the player enters the fog gate.

---

## 6. Pilot Boss Deep-Dive: Prince Rahu-Ketu, Herald of the Eclipse

```
                           [BOSS ARCHITECTURE]

                      ┌───────────────────────────┐
                      │    PRINCE RAHU-KETU       │
                      │  (3.2m Cyber-Demon Archon)│
                      └─────────────┬─────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
    ┌───────────────────────────┐             ┌───────────────────────────┐
    │  PHASE 1 (100% - 50% HP)  │             │   PHASE 2 (50% - 0% HP)   │
    │  - Twin Crescent Blades   │             │   - "The False Eclipse"   │
    │  - 3-Hit Parryable Combos │             │   - Arena Dims to Void    │
    │  - Leaping Shockwave Slam │             │   - Shadow Mirage Clones  │
    │  - Glitch Sidestep        │             │   - Orbital Dark Beams    │
    └───────────────────────────┘             └───────────────────────────┘
```

### 6.1 Visual Appearance & Rigging
- **Height**: 3.2 meters.
- **Design**: A four-armed cybernetic demigod. Upper two arms wield twin shimmering **Crescent Eclipse Scythe-Swords** (black metal edges dripping with golden photonic plasma). Lower two arms perform mudras (sacred hand seals) that channel barrier shields and dark-matter projectiles.
- **Costume**: Jet-black carbon-fiber armor draped in ceremonial crimson and gold ecumenical silk robes. His face is concealed behind a polished golden mirror-mask featuring an eclipse symbol that shifts with his emotional state.

### 6.2 Move List & Frame Data

#### 1. Crescent Twin Cleave (Phase 1 & 2)
- **Telegraph**: Raises both blades to right shoulder. Blades hum at 660 Hz with a **Yellow Spark Flash** (Parryable cue).
- **Startup**: 28 frames.
- **Active**: 4 frames (horizontal outward cross-cut).
- **Parry Window**: Frames 24–28.
- **Punish**: If parried, Rahu-Ketu reels backward, stunned for 210 frames (3.5s).

#### 2. Overhead Celestial Splitter (Phase 1 & 2)
- **Telegraph**: Leaps 1.5m into the air, blades locked into a guillotine scissor.
- **Startup**: 42 frames.
- **Active**: 6 frames (vertical slam with directional forward shockwave traveling 8m).
- **Defense**: Must be side-rolled. (Parrying requires exact frame-perfect timing; blocking drains 80% stamina).

#### 3. Eclipse Vortex Slam (Phase 1 & 2) — UNBLOCKABLE
- **Telegraph**: Boss crouches low, lower hands touch the floor. **Intense Red Glint Flash** on chest with low rumbling bass drop (`sound.playTelegraph(true)`).
- **Startup**: 55 frames.
- **Active**: 8 frames (360-degree ground eruption of dark plasma, radius 6m).
- **Defense**: **Cannot be blocked or parried**. Player *must* execute a directional Dodge Roll or sprint out of the 6m blast radius.

#### 4. Shadow Glitch Sidestep
- If the player attacks during boss neutral or circles behind him, Rahu-Ketu teleports laterally 5m with a digital artifact trail, immediately prepping a counter-swing.

---

### 6.3 Phase 2 Transition: "The False Eclipse" (At 50% HP)

1. **Cutscene Trigger**: Boss disengages, leaps to the central altar pedestal, and drives both blades into the marble.
2. **Audio Stinger**: Ambient choir abruptly stops. A massive sub-bass drop roars (`sound.playBossPhase2()`).
3. **Visual Transformation**:
   - The cathedral's holographic stained-glass windows switch from gold to deep pitch black with a blinding white solar corona (an artificial total solar eclipse).
   - Arena directional lighting dims by $85\%$. The only light sources are the boss's burning red eyes and the player's incandescent *Sword of the Spirit*.
4. **New Mechanics in Phase 2**:
   - **Shadow Mirage Clone**: During attack combos, a spectral purple phantom clone executes the same attack $0.4\text{ seconds}$ behind the boss. The player must delay their second dodge roll to evade the after-image!
   - **Dark Solar Laser Array**: Boss levitates above the altar and sweeps 3 rotating laser beams across the floor. Player must time their dodge rolls through the beams while closing the distance.

---

## 7. Complete UI & HUD Specifications

```
+-------------------------------------------------------------------------+
| [HP]  ============================== (480/480)                          |
| [STM] ==================== (120/120)                                    |
| [FLASK] [3/3] Estus                                                     |
|                                                                         |
|                                    [LOCK-ON RETICLE]                    |
|                                           (◊)                           |
|                                                                         |
|                                                                         |
|                                                                         |
|                                                                         |
|                                                                         |
| [EQUIP: 48.2% - MED ROLL]                           [GRACE: 1,450 ✦]    |
|-------------------------------------------------------------------------|
| [BOSS] PRINCE RAHU-KETU, HERALD OF THE ECLIPSE                          |
| [HP]   ================================================= (2,800/3,500)  |
+-------------------------------------------------------------------------+
```

### 7.1 Interactive Elements & Controls
- **Lock-On Reticle**: Golden rotating diamond `(◊)` pinned to the active enemy's center of mass in screen-space. When enemy is in Stance Broken state, the reticle turns into a pulsing red visceral target.
- **Combat Notification Toasts**: Cinematic center-screen banners:
  - *"STANCE BROKEN"* (Yellow glowing serif text)
  - *"DELIVERANCE ACHIEVED"* (Pure white holy radiant text)
  - *"ARCHON VANQUISHED"* (Epic golden font accompanied by victory bell)
  - *"DEFEATED — THE REMNANT ENDURES"* (Solemn crimson fade-out)

---

## 8. Technical Architecture for the Incoming Developer

### 8.1 Engine & Directory Blueprint

```
cmathgit.github.io/ai-apps/game/
├── index.html                   # Shell container, WebGL canvas, HUD overlays, font links
├── GAME_DESIGN_DOCUMENT.md      # Master GDD (This document)
├── css/
│   └── style.css                # Dark cyber-gothic UI, flex/grid layouts, responsive styling
├── js/
│   ├── engine/
│   │   ├── renderer.js          # Three.js WebGLRenderer, ACES tone-mapping, PCF soft shadows
│   │   ├── input.js             # Buffered keyboard/mouse/gamepad listener + lock-on toggles
│   │   ├── physics.js           # Octree spatial partition + Kinematic Capsule Collision
│   │   ├── camera.js            # Smooth 3rd-person follow/orbit cam + lock-on framing
│   │   └── audio.js             # Web Audio synthesizer (ALREADY IMPLEMENTED & READY)
│   ├── entities/
│   │   ├── player.js            # Player controller, state machine, iFrame ticker, attack combos
│   │   ├── enemy.js             # Deceived Initiate & Enforcer AI: patrol, aggro, telegraphs
│   │   └── boss.js              # Prince Rahu-Ketu AI: multi-phase behavior tree, mirage clone
│   ├── systems/
│   │   ├── combat.js            # Hitbox vs Hurtbox detection, damage calculations, poise math
│   │   ├── inventory.js         # Equipment load tiers, item weights, armor defense values
│   │   └── progression.js       # Grace currency accounting, Altar stat leveling logic
│   ├── world/
│   │   └── level.js             # Procedural cathedral geometry (nave, pillars, altar, lighting)
│   └── main.js                  # Game loop orchestrator (60 FPS requestAnimationFrame), UI sync
```

### 8.2 Kinematic Capsule & Octree Collision (The Developer's Golden Rule)
To eliminate floatiness and prevent the player from falling through floors or jittering on stairs:
1. **Never use full rigid-body dynamic physics (like default Cannon bodies) for the player character**.
2. Represent the player as a `Capsule` (`radius: 0.45m`, `height: 1.8m`).
3. Generate an `Octree` from all stationary level meshes (floors, steps, pillars, walls).
4. On each tick:
   - Apply gravity ($\vec{g} = -28\text{ m/s}^2$).
   - Apply player horizontal velocity from input / roll root-motion.
   - Call `octree.capsuleIntersect(playerCapsule)`. If colliding, displace the capsule along the contact normal and project velocity onto the contact plane.
   - This provides instantaneous, razor-sharp Souls movement on any surface.

---

## 9. Next Steps & Developer Handoff Checklist

- [x] IP Theme chosen: **IP Pitch 1 (*REMNANT: PROTOCOL 66*)**.
- [x] Mathematical combat specs documented: iFrame tables, Equip Load tiers, Timed Parry timeline, stat scaling.
- [x] Visual style guide & Three.js lighting recipes established.
- [x] Pilot level area (*Cathedral of the False Light*) mapped from spawn to boss room.
- [x] Boss fight (*Prince Rahu-Ketu*) move list, frame data, and Phase 2 eclipse mechanics fully detailed.
- [x] Procedural sound engine implemented and verified in [js/engine/audio.js](file:///c:/cygwin64/home/etrwh/repos/git/cmathgit/public/cmathgit.github.io/ai-apps/game/js/engine/audio.js).
- [ ] Next developer can initialize `index.html`, `renderer.js`, `physics.js`, and assemble the playable prototype directly from this master document!
