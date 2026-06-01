#include "TitleScene.h"

void TitleScene::Show() {
    visible_ = true;
}

void TitleScene::Hide() {
    visible_ = false;
}

bool TitleScene::IsVisible() const {
    return visible_;
}

void TitleScene::Render(SDL_Renderer* renderer, int windowWidth, int windowHeight) const {
    if (!visible_ || renderer == nullptr) {
        return;
    }

    SDL_SetRenderDrawBlendMode(renderer, SDL_BLENDMODE_BLEND);
    SDL_SetRenderDrawColor(renderer, 0, 0, 0, 200);
    SDL_Rect overlay{0, 0, windowWidth, windowHeight};
    SDL_RenderFillRect(renderer, &overlay);

    SDL_SetRenderDrawColor(renderer, 220, 220, 220, 255);
    SDL_Rect panel{windowWidth / 4, windowHeight / 4, windowWidth / 2, windowHeight / 2};
    SDL_RenderFillRect(renderer, &panel);

    SDL_SetRenderDrawColor(renderer, 40, 40, 40, 255);
    SDL_RenderDrawRect(renderer, &panel);
}
