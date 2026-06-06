Heat Dweller Animation Tool

A lightweight Windows desktop application for creating and exporting ANM2 animation files for the Heat Dweller engine.

This tool is a deterministic animation editor and compiler, inspired by The Binding of Isaac animation pipeline.

It is not a drawing program.

Overview

The tool converts sprite atlas data (Aseprite / LibreSprite) into structured, engine-ready animations.

It supports:

Sprite sheet + JSON import
Frame extraction and indexing
Automatic animation grouping
Timeline-based animation editing
Optional baked interpolation (compile-time only)
Real-time animation preview
ANM2 export (deterministic output)
Frame pivot editing
Frame-bound animation events
Pipeline
Aseprite / LibreSprite
        ↓
PNG + JSON Export
        ↓
Importer (Frame Extraction)
        ↓
Frame Registry (Immutable Assets)
        ↓
Animation Grouping System
        ↓
Animation Editor (Timeline Layer)
        ↓
Compiler (Interpolation + Event + Pivot Bake)
        ↓
ANM2 Export (Heat Dweller Engine)
Design Philosophy
1. Immutable Source Frames
Frames are imported directly from sprite atlas data
Never modified after import
Stored in a global frame registry
2. Editable Animation Layer
Animations reference imported frames
Controls order, timing, transforms, and easing
Does not modify source frames
3. Deterministic Output
All animations compile into explicit frame sequences
No runtime interpolation exists in the engine
Output is fully reproducible
4. Frame-Synced Events
Frames can contain gameplay or audio triggers
Events are deterministic and tied to frame index
Fully compiled into ANM2 output
5. Pivot-Based Spatial Control
Every frame supports a pivot anchor point
Used for rotation, scaling, and alignment stability
Ensures consistent animation behavior across directions
Supported Input

Supports Aseprite / LibreSprite JSON formats.

Object-style
"frames": {
  "BodyVert1 0": {
    "frame": { "x": 144, "y": 48, "w": 48, "h": 48 },
    "duration": 100
  }
}
Array-style
"frames": [
  {
    "filename": "BodyVert1 0",
    "frame": { "x": 144, "y": 48, "w": 48, "h": 48 },
    "duration": 100
  }
]
Data Model
Sprite Sheet
struct SpriteSheet {
    SDL_Texture* texture;
    int width;
    int height;
};
Frame (Imported Asset)
struct Frame {
    std::string name;
    SDL_Rect rect;
    int duration;

    float pivotX = 0.5f;
    float pivotY = 0.5f;
};
Frame Transform (Editor Only)
struct FrameTransform {
    float rotation = 0.0f;
    float scaleX = 1.0f;
    float scaleY = 1.0f;
    float offsetX = 0.0f;
    float offsetY = 0.0f;
};
Animation Event

Frame-bound deterministic trigger system.

struct AnimationEvent {
    std::string type;     // "Shoot", "Sound", "Explode"
    std::string payload;  // optional parameter (sound name, projectile id, etc.)
};
Animation Frame
struct AnimationFrame {
    const Frame* frame;
    FrameTransform transform;
    int duration;
    bool interpolated = false;
    std::string easingType = "linear";

    std::vector<AnimationEvent> events;
};
Animation
struct Animation {
    std::string name;
    std::vector<AnimationFrame> frames;
};
Animation Naming System

Animations are automatically grouped using frame names.

Format
AnimationName Direction Index
Example
BodyVert1 0
BodyVert1 1
BodyVert1 2
Grouping Rules
Trailing numeric index is removed
Remaining prefix becomes animation name
Direction tokens are preserved
Direction Tokens
Token	Meaning
Vert1	Up
Vert2	Down
Hori	Horizontal
Direction System (UPDATED)

The engine uses a simplified 3-direction system.

Canonical Facing Direction

All sprites are authored facing LEFT by default.

Hori = base animation (LEFT facing)
RIGHT is produced via horizontal flip
Vertical Animations
Vert1 → Upward animation
Vert2 → Downward animation
Horizontal Animations
Hori → LEFT facing base
RIGHT → runtime flip (scaleX = -1)
Runtime Behavior
Facing Left → normal rendering
Facing Right → horizontal flip applied
Pivot Point System
Purpose

Pivot points define the anchor used for:

rotation
scaling
flipping consistency
frame alignment stability
Definition
float pivotX; // 0.0 - 1.0
float pivotY; // 0.0 - 1.0
Coordinate System
(0,0) = top-left
(0.5,0.5) = center
(1,1) = bottom-right
Flip Behavior

When facing RIGHT:

pivotX is mirrored
ensures symmetric animation behavior
Render Order (Critical)
Apply pivot offset
Apply frame transform
Apply animation transform
Apply direction flip
Animation Event System
Purpose

Frames can trigger deterministic gameplay or audio events.

Examples
Shoot projectile
Play sound
Trigger explosion
Enable hitbox
Spawn particles
Event Model
struct AnimationEvent {
    std::string type;     // e.g. "Shoot", "Sound", "Explode"
    std::string payload;  // optional parameter
};
Behavior Rules
Events trigger only when frame is entered
Execute exactly once per cycle
No interpolation-based triggering
Fully deterministic
Example
Frame 3:
  Event: Shoot ("BulletSmall")

Frame 5:
  Event: Sound ("enemy_attack_01")

Frame 8:
  Event: Explode ("dust_puff")
Engine Interpretation

C++ engine parses events during playback:

checks current frame index
executes event list
dispatches gameplay hooks
Interpolation System (Optional)
Modes
1. Jump Cut (Default)
Instant frame switching
Isaac-style behavior
2. Baked Interpolation
Generates intermediate frames
Fully expanded at compile time
Supported Easing
Linear
Quadratic (in/out/in-out/out-in)
Cubic (in/out/in-out/out-in)
Constraint
No runtime interpolation exists
All smoothing is precomputed
Preview System
SDL2 sprite viewer
Frame rectangle overlay
Zoom and pan
Animation playback controls
Transform preview
Event preview (debug mode)
Editor Layout
Left Panel
Animation list
Group browser
Center Panel
Sprite sheet view
Frame selection overlay
Pivot editor
Right Panel
Frame inspector
Transform editor
Event editor
Interpolation settings
Bottom Panel
Import PNG / JSON
Export ANM2
Export System (ANM2)

Exports deterministic ANM2 XML compatible with Heat Dweller engine.

Includes:

Animation definitions
Frame ordering
Frame rectangles
Frame durations
Baked transforms
Baked interpolation
Baked pivot points
Frame events
Version 1 Goals

A working v1 must allow:

Import PNG + JSON
Extract and register frames
Auto-group animations
Edit frame order and timing
Pivot editing
Event assignment per frame
Support Vert1 / Vert2 / Hori system
Toggle jump-cut or interpolation mode
Choose easing types
Real-time preview
Export valid ANM2 files
Not Included

This tool is NOT:

a drawing program
a pixel editor
a skeletal animation system
a runtime tweening engine