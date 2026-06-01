#include "Animation.h"
#include <SDL_image.h>
#include <fstream>
#include <nlohmann/json.hpp>

SpriteAtlas::SpriteAtlas() = default;

SpriteAtlas::~SpriteAtlas() {
    if (texture_ != nullptr) {
        SDL_DestroyTexture(texture_);
        texture_ = nullptr;
    }
}

bool SpriteAtlas::Load(SDL_Renderer* renderer, const std::string& atlasPath, const std::string& imagePath) {
    if (renderer == nullptr) {
        return false;
    }

    std::ifstream file(atlasPath);
    if (!file.is_open()) {
        return false;
    }

    try {
        nlohmann::json json;
        file >> json;

        if (!json.contains("frames")) {
            return false;
        }

        for (auto it = json["frames"].begin(); it != json["frames"].end(); ++it) {
            const std::string frameName = it.key();
            const auto& frameValue = it.value()["frame"];
            SpriteFrame frame;
            frame.x = frameValue.value("x", 0);
            frame.y = frameValue.value("y", 0);
            frame.w = frameValue.value("w", 0);
            frame.h = frameValue.value("h", 0);
            frames_.emplace(frameName, frame);
        }
    } catch (const std::exception&) {
        return false;
    }

    texture_ = IMG_LoadTexture(renderer, imagePath.c_str());
    return texture_ != nullptr;
}

const SpriteFrame* SpriteAtlas::GetFrame(const std::string& frameName) const {
    auto it = frames_.find(frameName);
    return it != frames_.end() ? &it->second : nullptr;
}

SDL_Texture* SpriteAtlas::Texture() const {
    return texture_;
}
