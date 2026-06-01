#pragma once

#include <string>
#include "Animation.h"

struct GameConfig {
    int worldWidth = 1600;
    int worldHeight = 1200;
    int tileSize = 80;
    int rows = 15;
    int cols = 20;

    int playerStartX = 800;
    int playerStartY = 600;
    int playerWidth = 40;
    int playerHeight = 40;
    int playerSpeed = 220;
    float frameSpeed = 0.08f;
    float blinkDuration = 0.12f;
};

class ConfigLoader {
public:
    static GameConfig Load(const std::string& path);
};
