#include "InputManager.h"

void InputManager::ProcessEvent(const SDL_Event& event) {
    if (event.type == SDL_KEYDOWN && event.key.repeat == 0) {
        switch (event.key.keysym.scancode) {
            case SDL_SCANCODE_A: state_.left = true; break;
            case SDL_SCANCODE_D: state_.right = true; break;
            case SDL_SCANCODE_W: state_.up = true; break;
            case SDL_SCANCODE_S: state_.down = true; break;
            case SDL_SCANCODE_LEFT: state_.attackLeft = true; break;
            case SDL_SCANCODE_RIGHT: state_.attackRight = true; break;
            case SDL_SCANCODE_UP: state_.attackUp = true; break;
            case SDL_SCANCODE_DOWN: state_.attackDown = true; break;
            case SDL_SCANCODE_RETURN: state_.startPressed = true; break;
            default: break;
        }
    } else if (event.type == SDL_KEYUP) {
        switch (event.key.keysym.scancode) {
            case SDL_SCANCODE_A: state_.left = false; break;
            case SDL_SCANCODE_D: state_.right = false; break;
            case SDL_SCANCODE_W: state_.up = false; break;
            case SDL_SCANCODE_S: state_.down = false; break;
            case SDL_SCANCODE_LEFT: state_.attackLeft = false; break;
            case SDL_SCANCODE_RIGHT: state_.attackRight = false; break;
            case SDL_SCANCODE_UP: state_.attackUp = false; break;
            case SDL_SCANCODE_DOWN: state_.attackDown = false; break;
            case SDL_SCANCODE_RETURN: state_.startPressed = false; break;
            default: break;
        }
    }
}

const InputState& InputManager::State() const {
    return state_;
}

void InputManager::ResetStart() {
    state_.startPressed = false;
}
