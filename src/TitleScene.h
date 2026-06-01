#pragma once

#include <SDL.h>

class TitleScene {
public:
    void Show();
    void Hide();
    bool IsVisible() const;
    void Render(SDL_Renderer* renderer, int windowWidth, int windowHeight) const;

private:
    bool visible_ = true;
};
