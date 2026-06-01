#include "ConfigLoader.h"
#include <fstream>
#include <filesystem>
#include <nlohmann/json.hpp>

GameConfig ConfigLoader::Load(const std::string& path) {
    GameConfig config;
    if (!std::filesystem::exists(path)) {
        return config;
    }

    std::ifstream input(path);
    if (!input.is_open()) {
        return config;
    }

    try {
        nlohmann::json json;
        input >> json;

        if (json.contains("world")) {
            const auto& world = json["world"];
            config.worldWidth = world.value("width", config.worldWidth);
            config.worldHeight = world.value("height", config.worldHeight);
            config.tileSize = world.value("tileSize", config.tileSize);
            config.rows = world.value("rows", config.rows);
            config.cols = world.value("cols", config.cols);
        }

        if (json.contains("player")) {
            const auto& player = json["player"];
            config.playerStartX = player.value("startX", config.playerStartX);
            config.playerStartY = player.value("startY", config.playerStartY);
            config.playerWidth = player.value("width", config.playerWidth);
            config.playerHeight = player.value("height", config.playerHeight);
            config.playerSpeed = player.value("baseSpeed", config.playerSpeed);
        }

        if (json.contains("animation")) {
            const auto& animation = json["animation"];
            config.frameSpeed = animation.value("frameSpeed", config.frameSpeed);
            config.blinkDuration = animation.value("blinkDuration", config.blinkDuration);
        }
    } catch (const std::exception&) {
        // Keep defaults on parse failure.
    }

    return config;
}
