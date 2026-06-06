#pragma once

#include <string>
#include <vector>
#include "ResourceTypes.h"

class ResourceLoader {
public:
    ResourceLoader() = default;
    ~ResourceLoader() = default;

    bool LoadAll(const std::string& resourcesPath);

    const std::vector<Item>& Items() const { return items_; }
    const std::vector<Sound>& Sounds() const { return sounds_; }
    const std::vector<Enemy>& monsters() const { return enemies_; }

private:
    void ParseFile(const std::string& path);
    void ParseItems(const std::string& content);
    void ParseSounds(const std::string& content);
    void ParseEnemies(const std::string& content);

    std::vector<Item> items_;
    std::vector<Sound> sounds_;
    std::vector<Enemy> enemies_;
};
