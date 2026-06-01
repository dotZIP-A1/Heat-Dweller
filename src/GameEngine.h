#pragma once

#include <memory>
#include <string>
#include "Animation.h"
#include "ConfigLoader.h"
#include "InputManager.h"
#include "Renderer.h"
#include "TitleScene.h"
#include "ResourceLoader.h"
#include "ItemManager.h"
#include "AudioManager.h"

enum class GameState {
    Title,
    Playing,
};

struct WorldConfig {
    int width = 1600;
    int height = 1200;
    int tileSize = 80;
    int rows = 15;
    int cols = 20;
};

struct PlayerData {
    float x = 800.0f;
    float y = 600.0f;
    int width = 40;
    int height = 40;
    float speed = 220.0f;
    Direction facing = Direction::Down;
    bool moving = false;
    float animationTime = 0.0f;
    float blinkTime = 0.0f;
    float nextBlink = 0.0f;
    bool blinking = false;
};

class GameEngine {
public:
    GameEngine();
    ~GameEngine();

    bool Initialize();
    void Run();

    const ItemManager& Items() const { return itemManager_; }
    const AudioManager& Audio() const { return audioManager_; }

private:
    bool InitializeSDL();
    void ShutdownSDL();
    void LoadResources();
    void ProcessEvents();
    void Update(float deltaTime);
    void Render();
    void StartGame();
    void UpdatePlayer(float deltaTime);
    std::string GetBodyFrame() const;
    std::string GetHeadFrame() const;

    SDL_Window* window_ = nullptr;
    std::unique_ptr<Renderer> rendererWrapper_;

    GameState gameState_ = GameState::Title;
    GameConfig config_;
    WorldConfig world_;
    PlayerData player_;
    InputState inputState_;
    InputManager inputManager_;
    TitleScene titleScene_;
    SpriteAtlas characterAtlas_;
    SpriteAtlas swordAtlas_;
    ResourceLoader resourceLoader_;
    ItemManager itemManager_;
    AudioManager audioManager_;
    float lastTime_ = 0.0f;
    float roomTransitionCooldown_ = 0.0f;
};
