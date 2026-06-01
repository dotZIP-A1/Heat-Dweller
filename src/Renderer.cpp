#include "Renderer.h"
#include <SDL_image.h>
#include <stdexcept>
#include <cmath>

Renderer::Renderer() = default;

Renderer::~Renderer() {
    Shutdown();
}

bool Renderer::Initialize(SDL_Window* window) {
    if (renderer_ != nullptr) {
        return true;
    }

    renderer_ = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);
    return renderer_ != nullptr;
}

void Renderer::Shutdown() {
    if (renderer_ != nullptr) {
        SDL_DestroyRenderer(renderer_);
        renderer_ = nullptr;
    }
}

void Renderer::Clear() {
    if (renderer_ == nullptr) {
        return;
    }
    SDL_RenderClear(renderer_);
}

void Renderer::Present() {
    if (renderer_ == nullptr) {
        return;
    }
    SDL_RenderPresent(renderer_);
}

void Renderer::SetDrawColor(SDL_Color color) {
    if (renderer_ == nullptr) {
        return;
    }
    SDL_SetRenderDrawColor(renderer_, color.r, color.g, color.b, color.a);
}

void Renderer::DrawFilledRect(const SDL_Rect& rect, SDL_Color color) {
    if (renderer_ == nullptr) {
        return;
    }
    SetDrawColor(color);
    SDL_RenderFillRect(renderer_, &rect);
}

void Renderer::DrawAtlasFrame(const SpriteAtlas& atlas, const std::string& frameName, const SDL_Rect& destination, bool flip, float offsetY, float scaleX, float scaleY) {
    if (renderer_ == nullptr) {
        return;
    }

    const SpriteFrame* frame = atlas.GetFrame(frameName);
    if (frame == nullptr || atlas.Texture() == nullptr) {
        return;
    }

    SDL_Rect source{ frame->x, frame->y, frame->w, frame->h };

    // Apply offsetY (positive moves sprite up on screen)
    SDL_FRect destF;
    destF.x = static_cast<float>(destination.x);
    destF.y = static_cast<float>(destination.y) - offsetY; // offset before camera transform
    destF.w = static_cast<float>(destination.w);
    destF.h = static_cast<float>(destination.h);

    // Apply scaling around center
    if (scaleX != 1.0f || scaleY != 1.0f) {
        float centerX = destF.x + destF.w * 0.5f;
        float centerY = destF.y + destF.h * 0.5f;
        float newW = destF.w * scaleX;
        float newH = destF.h * scaleY;
        destF.x = centerX - newW * 0.5f;
        destF.y = centerY - newH * 0.5f;
        destF.w = newW;
        destF.h = newH;
    }

    SDL_RendererFlip flipFlag = flip ? SDL_FLIP_HORIZONTAL : SDL_FLIP_NONE;
#if SDL_VERSION_ATLEAST(2,0,10)
    SDL_RenderCopyExF(renderer_, atlas.Texture(), &source, &destF, 0.0, nullptr, flipFlag);
#else
    // Fallback: convert to integer rect (may lose sub-pixel precision)
    SDL_Rect intDest{ static_cast<int>(std::round(destF.x)), static_cast<int>(std::round(destF.y)), static_cast<int>(std::round(destF.w)), static_cast<int>(std::round(destF.h)) };
    SDL_RenderCopyEx(renderer_, atlas.Texture(), &source, &intDest, 0.0, nullptr, flipFlag);
#endif
}

SDL_Renderer* Renderer::Native() const {
    return renderer_;
}
