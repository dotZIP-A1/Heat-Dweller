# Heat Dweller - Room Editor (Goal & Design Document)

## Overview

The Room Editor is a standalone desktop application used to create and edit grid-based rooms for the game Heat Dweller. It outputs `.room` files that are loaded directly by the game engine.

The purpose of this tool is to allow fast, visual creation of rooms without manually editing JSON or code.

---

## Core Goal

The main goal of the Room Editor is to:

* Provide a simple grid-based interface for room creation
* Allow placing and removing objects on a fixed tile grid
* Save and load rooms using the `.room` file format
* Export data in JSON format for use in the C++ game engine

---

## Target Resolution & Grid

* Target game resolution: 1920x1080
* Grid-based system (default suggested: 13x7 or similar)
* Each tile represents a fixed unit space (128x128 recommended)
* All objects snap to grid cells

---

## Object System

Objects are placed onto the grid and represent gameplay elements.

Each object contains:

* type (string identifier)
* x (grid position)
* y (grid position)
* rotation (0, 90, 180, 270)

Example object:
{
"type": "Fireling",
"x": 4,
"y": 3,
"rotation": 0
}

---

## Editor Features

### Must Have (MVP)

* Grid display
* Click to place objects
* Right click to remove objects
* Object palette (select current object type)
* Rotate object using "R" key
* Save room to `.room` file
* Load `.room` file
* Clear room

---

## File Format

### Extension

* `.room`

### Internal Format

* JSON-based structure

Example:
{
"name": "Basement Room 001",
"width": 13,
"height": 7,
"objects": []
}

---

## Folder Structure (Recommended)

heat-dweller/
├── resources/
│
├── tools/
│   └── RoomEditor/
│       ├── src/
│       ├── assets/
│       └── RoomEditor.exe
│
└── src/

---

## Object Definitions (Future Expansion)

Objects should eventually be defined using external data files:

* Each object has metadata (sprite, collision, type)
* Editor auto-loads available objects from definitions folder
* No hardcoding object types inside editor

---

## Future Features

* Test Room button (launch game with selected room)
* Multi-object layers (background, foreground, entities)
* Undo / redo system
* Room variants and procedural tagging
* Enemy configuration editing inside editor

---

## Design Philosophy

* Simplicity first
* Fast iteration over visual polish
* Data-driven system (no hardcoded room layouts)
* Editor should always reflect game rules exactly
