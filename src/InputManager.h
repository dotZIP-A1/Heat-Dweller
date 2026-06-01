#pragma once

#include <SDL.h>

struct InputState {
    bool left = false;
    bool right = false;
    bool up = false;
    bool down = false;
    bool attackLeft = false;
    bool attackRight = false;
    bool attackUp = false;
    bool attackDown = false;
    bool startPressed = false;
};

class InputManager {
public:
    void ProcessEvent(const SDL_Event& event);
    const InputState& State() const;
    void ResetStart();

private:
    InputState state_;
};
