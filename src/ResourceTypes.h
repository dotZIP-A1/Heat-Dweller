#pragma once

#include <string>
#include <unordered_map>

struct Item {
    std::string id;
    std::string name;
    std::string type;
    std::unordered_map<std::string, std::string> properties;
};

struct Sound {
    std::string id;
    std::string path;
    std::string event;
};

struct Enemy {
    std::string id;
    std::string name;
    int health = 0;
    std::unordered_map<std::string, std::string> properties;
};
