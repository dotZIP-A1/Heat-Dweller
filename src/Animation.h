#pragma once

#include <SDL.h>
#include <string>
#include <unordered_map>

enum class Direction {
    Up,
    Down,
    Left,
    Right,
};

struct SpriteFrame {
    int x = 0;
    int y = 0;
    int w = 0;
    int h = 0;
};

class SpriteAtlas {
public:
    SpriteAtlas();
    ~SpriteAtlas();

    bool Load(SDL_Renderer* renderer, const std::string& atlasPath, const std::string& imagePath);
    const SpriteFrame* GetFrame(const std::string& frameName) const;
    SDL_Texture* Texture() const;

private:
    SDL_Texture* texture_ = nullptr;
    std::unordered_map<std::string, SpriteFrame> frames_;
};
