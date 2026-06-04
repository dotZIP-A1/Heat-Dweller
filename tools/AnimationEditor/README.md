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
Compiler (Interpolation Bake)
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
Does not alter source frames
3. Deterministic Output
All animations compile into explicit frame sequences
No runtime interpolation exists in the engine
Output is fully reproducible
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
};
Frame Transform (Editor Only)
struct FrameTransform {
    float rotation = 0.0f;
    float scaleX = 1.0f;
    float scaleY = 1.0f;
    float offsetX = 0.0f;
    float offsetY = 0.0f;
};
Animation Frame
struct AnimationFrame {
    const Frame* frame;
    FrameTransform transform;
    int duration;
    bool interpolated = false;
    std::string easingType = "linear";
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
Token	Meaning
Vert1	Up
Vert2	Down
Hori	Horizontal (base direction = LEFT)
Direction System (UPDATED)

The engine uses a simplified 3-direction system.

⚠ Important Change: Canonical Facing Direction

All sprites are authored facing LEFT by default.

This means:

Hori = base animation (facing LEFT)
Facing RIGHT is achieved via runtime horizontal flip
Vertical Animations
Vert1 → Upward-facing animation
Vert2 → Downward-facing animation
Horizontal Animations
Hori → Base left-facing animation
Right-facing is produced via flip (scaleX = -1 or texture flip)
Runtime Behavior
Facing Left → normal rendering (no flip)
Facing Right → horizontal flip applied
Interpolation System (Optional)

Interpolation is compile-time only and never exists at runtime.

Modes
1. Jump Cut (Default)
Frames switch instantly
Isaac-style behavior
Lowest overhead
2. Interpolated (Baked)
Intermediate frames are generated
Smooth motion using easing curves
Fully expanded into explicit frames
Supported Easing
Linear
Quadratic (in/out/in-out/out-in)
Cubic (in/out/in-out/out-in)
Critical Constraint

ANM2 is strictly frame-based.

Therefore:

No runtime interpolation exists
All easing is baked into frames
Output is fully deterministic
Preview System
Sprite sheet viewer (SDL2)
Frame rectangle overlay
Zoom and pan support
Animation playback (loop / pause / step)
Transform preview
Interpolation preview (pre-bake)
Editor Layout
Left Panel
Animation list
Group browser
Center Panel
Sprite sheet view
Frame selection overlay
Right Panel
Frame inspector
Transform editor
Interpolation settings
Bottom Panel
Import PNG / JSON
Export ANM2
Export System (ANM2)

Exports valid ANM2 XML files compatible with the Heat Dweller engine.

Includes:

Animation definitions
Frame ordering
Frame rectangles
Frame durations
Baked transforms
Baked interpolation (if enabled)
Future Features (v2+)
Pivot point editor
Event markers (sound/game triggers)
Timeline strip view
Curve editor UI
Multi-spritesheet support
Layered animations
ANM2 import support
Version 1 Goals

A working v1 must allow:

Import PNG + JSON from Aseprite / LibreSprite
Extract and register frames
Auto-group animations
Edit frame order and timing
Support Vert1 / Vert2 / Hori system
Toggle jump-cut or interpolation mode
Choose easing types
Real-time preview
Export valid ANM2 files usable in-engine
Design Summary

This tool is a:

Deterministic ANM2 animation compiler with a visual editor layer, built around sprite atlas import, timeline-based animation editing, and optional baked interpolation.

Not Included

This tool is NOT:

a drawing program
a pixel editor
a skeletal animation system
a runtime tweening engine