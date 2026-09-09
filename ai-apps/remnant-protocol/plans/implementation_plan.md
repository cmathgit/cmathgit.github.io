# 3D Souls-Like Engine & IP Development Plan

## Overview
A high-fidelity, responsive 3D Souls-like Action RPG running directly in the browser using **HTML5, JavaScript, and Three.js**. The game translates the precision combat mechanics of titles like *Dark Souls*, *Bloodborne*, and *Lies of P* into 3D web graphics, featuring third-person lock-on, dodge rolling with frame-accurate invulnerability (iFrames), shield blocking & parrying, equipment load tiers (Light, Medium, Fat roll), Souls stat leveling, and multi-phase boss encounters.

---

## Technical Architecture & Engine Stack

### 1. Rendering & Atmosphere (`Three.js`)
- **WebGLRenderer** with ACESFilmicToneMapping and sRGB encoding.
- **Lighting & Post-Processing**:
  - Dramatic key/ambient lighting with dynamic shadow maps (`PCFSoftShadowMap`).
  - Volumetric atmospheric fog (`THREE.FogExp2`).
  - Emissive glow and particle systems for cyberpunk neon runes, laser crosshairs, and incandescent sacred light.
- **Character & World Meshing**:
  - Procedural / stylized modular 3D models with PBR materials (`MeshStandardMaterial`), normal/roughness/metalness maps, and bone-rigged or hierarchical joint animations (smooth slerp interpolations for attacks, rolls, parries, staggers).

### 2. Kinematic 3D Character Controller & Collision
- Rather than unpredictable floaty rigid-body physics, we will implement a **Kinematic Capsule Controller with Octree Level Collision**:
  - **Octree + Capsule Collider**: Tested standard in Three.js for tight responsiveness. Raycast ground checks, slope sliding, ledge boundaries, and obstacle avoidance without jitter.
  - **Player Combat Root Motion & Impulse**: Directional dodge roll impulses, forward attack lunges, knockback, and stagger recoil.

### 3. Souls-Like Combat State Machine
- **States**:
  - `IDLE`, `RUN`, `SPRINT`, `DODGE_ROLL`, `LIGHT_ATK_1`, `LIGHT_ATK_2`, `HEAVY_CHARGE`, `SHIELD_BLOCK`, `SHIELD_PARRY`, `RIPOSTE`, `STAGGER`, `HEAL_ESTUS`, `DEATH`.
- **iFrames & Equipment Load Tiers**:
  $$\text{Equip Load Ratio} = \frac{\text{Equipped Armor + Weapons Weight}}{\text{Max Equip Load}}$$
  - **Light Roll (< 30%)**: 14 iFrames (at 60 FPS), 1.25x roll travel distance, 120% stamina recovery rate.
  - **Medium Roll (30% - 70%)**: 11 iFrames, standard roll distance, 100% stamina recovery rate.
  - **Fat Roll (70% - 100%)**: 7 iFrames, sluggish belly/heavy shoulder slam, 70% stamina recovery, heavy recovery delay.
  - **Overburdened (> 100%)**: Cannot roll (stumbles instead), movement speed penalty.
- **Shield Parrying & Riposte**:
  - **Parry Window**: 4 frames startup $\rightarrow$ 6 frames active parry $\rightarrow$ 14 frames recovery.
  - If an enemy hitbox strikes during the active parry window:
    1. Camera micro-zoom + chromatic/spark particle burst.
    2. Deflecting sound wave gong / high-frequency clash.
    3. Enemy staggered into **Stance Broken** state for 3 seconds.
    4. Pressing attack near a staggered enemy triggers a devastating cinematic **Riposte / Visceral Deliverance**.
- **Block & Guard Break**:
  - Guarding reduces incoming damage based on Shield Absorption (Physical / Energy).
  - Depleting stamina while blocking triggers a **Guard Break Stagger** leaving the player vulnerable.

### 4. Lock-On & Third-Person Camera
- **Soft Cam / Orbit**: Smooth damp mouse/stick orbit around player character.
- **Lock-On Cam**: Toggle lock-on (Tab/Middle Click) to nearest enemy within 25m. Keeps enemy and player framed simultaneously; player movement transitions to strafing and directional dodging.

### 5. Boss AI System (Dark Prince Archetype)
- **Aggro & Spacing**: Dynamic behavior trees (patrol, closing distance, circle strafe, flank).
- **Telegraphed Windups**:
  - Visual flash: Yellow spark = Parryable attack; Red flare = Unblockable grab/slam (must dodge).
- **Multi-hit Combos & Delay Punishes**: Punishes panic rolling by varying swing timings.
- **Phase 2 Transformation**: At $\le 50\%$ HP, boss enters an enraged state with new particle effects, enhanced speed, arena-wide holy/demonic AoE attacks, and altered attack strings.

### 6. Progression & Leveling ("Grace & Talents")
- Defeating enemies grants **Grace / Sacred Cruor**.
- **Sanctuary / Altar**:
  - **Vigor**: Increases Max HP.
  - **Endurance**: Increases Max Stamina & Max Equip Load.
  - **Faith / Conviction**: Increases Sacred Weapon damage & Prayer efficacy.
  - **Fortitude**: Increases base physical damage negation & poise (hyper-armor).
  - **Discernment**: Increases Parry Frame window & Focus recharge.

---

## IP Pitches: Dystopian Cyber-Revelation

The user requested an IP where you play as a faithful Christian remnant in a dystopian cyberpunk era ruled by the Antichrist and a syncretic one-world religion, fighting regional dark princes/demons wielding Ephesians-themed armor and weapons, converting the deceived, and confronting apocalyptic entities.

### IP Pitch 1: REMNANT: PROTOCOL 66 (Recommended)
- **The World**:
  - Year 2084. Neo-Babylon. Following a global cataclysm, the *Technate Ecumenical Consortium* has synthesized all world religions, mythologies, and spiritualities into a centralized neural-hive cult: **The Pax Pantheon**.
  - The Seven Regional Archons (the "Dark Princes" of Daniel 10 and Revelation) rule the continental megacities. Each Archon has co-opted an ancient mythic avatar:
    - *Archon Rahu-Ketu* (The Twin Eclipsers: a cybernetic two-headed serpent-prince draining solar and spiritual illumination).
    - *Archon Tiangong* (The Void Hound of the East).
    - *Archon Huitzilopochtli* (The Solar Blood Furnace of the South).
    - *Archon Apollyon* (Lord of the Nanotech Abyss).
- **The Protagonist**:
  - **The Ephesian Remnant**: An underground exile equipped with prototype bio-pneumatic sacred armaments based on Ephesians 6:10-18:
    - **Helmet of Salvation**: Neural HUD that pierces demonic illusions and highlights weak points / parry timings.
    - **Breastplate of Righteousness**: High-density alloy kinetic chestplate providing hyper-armor poise.
    - **Belt of Truth**: Micro-fusion power core that stabilizes stamina and powers armaments.
    - **Shield of Faith**: Hard-light hexagonal aegis that absorbs energy and parries "all the fiery darts of the wicked".
    - **Sword of the Spirit**: High-frequency holy plasma blade, capable of cleaving through corrupted augmentations.
    - **Boots of the Gospel of Peace**: Magnetic / pneumatic boots providing swift quicksteps and ground traction.
- **Key Gameplay Twist — "Deliverance vs Execution" (Convert the Lost)**:
  - Human grunts and cyber-cultists are *The Deceived*. When their poise is broken, you can choose:
    - **Exorcise / Convert**: Channels prayer, freeing them from neural servitude. Converted souls provide *Sanctuary Allies*, passive blessings, and replenish Prayer vials.
    - **Execute**: Quick visceral attack yielding raw mechanical scrap / heavy components.

### IP Pitch 2: THE SEVENTH SEAL: SHADOWS OVER BABYLON
- **The World**: Focuses heavily on the cosmic horror of Revelation. The sky is perpetually eclipsed in a crimson techno-eclipse. The one-world religion worships the *Living Image* (an all-seeing AI supercomputer stationed inside the reconstructed Temple).
- **The Protagonist**: An "Order of Patmos" Knight using prayer-steeped technology. Dark, rain-soaked noir aesthetic reminiscent of *Bloodborne* meets *Blade Runner 2049*.

### IP Pitch 3: APOSTASY: EPHESIAN
- **The World**: A brutalist cyberpunk ruins aesthetic where remnants survive in catacombs beneath towering megastructures. Focuses on gritty mechanical weight, heavy armor modularity, and high-stakes parry-heavy duel combat like *Sekiro* meets *Lords of the Fallen*.

---

## Pilot Level Area: "Cathedral of the False Light — Sector 7"
The pilot area to be built will serve as the vertical slice:
1. **The Setting**: A neo-gothic cyber-cathedral with towering stained-glass projection screens, rain-slicked stone floors, exposed glowing conduit pipes, and altars to the syncretic pantheon.
2. **Enemies**:
   - *Cultist Deceiver* (Melee cultist with shock baton).
   - *Enforcer of the Mark* (Heavily armored sentinel with riot shield and laser lance).
3. **Pilot Boss**:
   - **"Prince Rahu-Ketu, Herald of the Eclipse"**:
     - A multi-limbed cyber-demonic warrior draped in gold-embroidered syncretic vestments and glowing occult circuit tattoos.
     - *Phase 1*: Wields twin crescent eclipse blades, fast combo strings, leaping aerial cleaves.
     - *Phase 2 (50% HP)*: The arena dims into an artificial solar eclipse; the boss ignites dark-matter aura blades and summons shadow phantom clones.

---

## User Review Required

> [!IMPORTANT]
> **IP Selection**: Please confirm if you would like to proceed with **IP Pitch 1: REMNANT: PROTOCOL 66** (featuring the Deliverance/Convert mechanic, Ephesians Panoply, and Prince Rahu-Ketu), or if you prefer modifications to the lore and setting.

> [!NOTE]
> **Physics & Controller Decision**: We propose using Three.js with an **Octree Kinematic Capsule Controller** rather than an external rigid-body physics engine like Cannon or Rapier, because it guarantees razor-sharp Souls-like movement, instantaneous dodge responsiveness, zero collision tunneling/jitter on stairs, and complete iframe accuracy.

---

## Proposed Project Structure

```
ai-apps/game/
├── index.html               # Main 3D Souls-Like game entry
├── css/
│   └── style.css            # Cyber-gothic Souls HUD, health bars, inventory, boss health bar
├── js/
│   ├── engine/
│   │   ├── renderer.js      # Three.js scene, lighting, camera, post-processing
│   │   ├── input.js         # Keyboard & mouse / gamepad controller + lock-on
│   │   ├── physics.js       # Kinematic Octree + Capsule collision system
│   │   └── audio.js         # Web Audio procedural synthesis (parry clashes, holy prayers, boss stingers)
│   ├── entities/
│   │   ├── player.js        # Souls player state machine (roll, iframes, attack, parry, block, stats)
│   │   ├── enemy.js         # Base enemy AI, telegraphs, stagger, conversion/exorcism
│   │   └── boss.js          # Boss "Rahu-Ketu" state machine, combo trees, phase transitions
│   ├── systems/
│   │   ├── combat.js        # Hitbox/hurtbox detection, damage calculations, poise, iframes
│   │   ├── inventory.js     # Equipment load tiers (Light/Med/Fat), weapons, Ephesians armor pieces
│   │   └── progression.js   # Grace/souls currency, stats leveling at Altars
│   ├── world/
│   │   └── level.js         # Procedural neo-gothic cyberpunk cathedral arena, pillars, altar, lighting
│   └── main.js              # Game loop orchestrator, UI HUD synchronization, state management
└── sample/                  # Existing 2D reference proof of concept (preserved)
```

---

## Verification Plan

### Automated / Browser Verification
- Launch local development HTTP server in `ai-apps/game/`.
- Load the game in the browser subagent / automated checks to confirm:
  1. Three.js canvas initializes without WebGL errors or console warnings.
  2. Player capsule spawns and responds to WASD movement, Sprint, and Camera Orbit.
  3. Dodge Roll correctly grants iFrames (verified by invincibility flags during roll window).
  4. Equip load changes switch dodge roll between Fast, Medium, and Fat roll.
  5. Shield Block reduces damage and drains stamina; Timed Parry deflects enemy attacks, triggers spark visuals, and inflicts Stance Break.
  6. Boss AI detects player, executes telegraphed combo attacks, and transitions phases at 50% HP.
  7. Altar allows spending Grace to level up Vigor, Endurance, Faith, Fortitude, and Discernment.
