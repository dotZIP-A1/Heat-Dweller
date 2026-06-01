#pragma once

#include <SDL.h>
#include <string>
#include <unordered_map>
#include "Animation.h"

class Renderer {
public:
    Renderer();
    ~Renderer();

    bool Initialize(SDL_Window* window);
    void Shutdown();

    void Clear();
    void Present();
    void SetDrawColor(SDL_Color color);
    void DrawFilledRect(const SDL_Rect& rect, SDL_Color color);
    // offsetY: vertical offset applied before camera transform (positive moves sprite up)
    // scaleX/scaleY: squash/stretch applied around the sprite center
    void DrawAtlasFrame(const SpriteAtlas& atlas, const std::string& frameName, const SDL_Rect& destination, bool flip = false, float offsetY = 0.0f, float scaleX = 1.0f, float scaleY = 1.0f);
    SDL_Renderer* Native() const;

private:
    SDL_Renderer* renderer_ = nullptr;
};
