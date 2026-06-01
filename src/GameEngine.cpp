#include "GameEngine.h"
#include <SDL.h>
#include <SDL_image.h>
#include <chrono>
#include <iostream>
#include <vector>

static std::string DirectionToString(Direction direction) {
    switch (direction) {
        case Direction::Up: return "up";
        case Direction::Down: return "down";
        case Direction::Left: return "left";
        case Direction::Right: return "right";
    }
    return "down";
}

GameEngine::GameEngine() = default;

GameEngine::~GameEngine() {
    ShutdownSDL();
}

bool GameEngine::Initialize() {
    if (!InitializeSDL()) {
        return false;
    }

    config_ = ConfigLoader::Load("resources/data/config.json");
    player_.x = static_cast<float>(config_.playerStartX);
    player_.y = static_cast<float>(config_.playerStartY);
    player_.width = config_.playerWidth;
    player_.height = config_.playerHeight;
    player_.speed = static_cast<float>(config_.playerSpeed);
    player_.animationTime = 0.0f;
    player_.blinkTime = 0.0f;
    player_.nextBlink = 2.0f;

    LoadResources();
    lastTime_ = static_cast<float>(SDL_GetTicks()) / 1000.0f;
    return true;
}

bool GameEngine::InitializeSDL() {
    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_AUDIO) != 0) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return false;
    }

    if (!(IMG_Init(IMG_INIT_PNG) & IMG_INIT_PNG)) {
        std::cerr << "IMG_Init failed: " << IMG_GetError() << '\n';
        return false;
    }

    window_ = SDL_CreateWindow(
        "Heat Dweller",
        SDL_WINDOWPOS_CENTERED,
        SDL_WINDOWPOS_CENTERED,
        1280,
        720,
        SDL_WINDOW_SHOWN | SDL_WINDOW_FULLSCREEN_DESKTOP
    );

    if (window_ == nullptr) {
        std::cerr << "SDL_CreateWindow failed: " << SDL_GetError() << '\n';
        return false;
    }

    rendererWrapper_ = std::make_unique<Renderer>();
    if (!rendererWrapper_->Initialize(window_)) {
        std::cerr << "Renderer initialize failed." << '\n';
        return false;
    }

    return true;
}

void GameEngine::ShutdownSDL() {
    if (rendererWrapper_) {
        rendererWrapper_->Shutdown();
        rendererWrapper_.reset();
    }

    if (window_ != nullptr) {
        SDL_DestroyWindow(window_);
        window_ = nullptr;
    }

    IMG_Quit();
    SDL_Quit();
}

void GameEngine::LoadResources() {
    if (rendererWrapper_ == nullptr) {
        return;
    }

    characterAtlas_.Load(rendererWrapper_->Native(),
        "resources/gfx/sprites/characters/character_001_matthew.json",
        "resources/gfx/sprites/characters/character_001_matthew.png");

    // Load XML resources and initialize managers
    if (resourceLoader_.LoadAll("resources")) {
        itemManager_.Initialize(resourceLoader_.Items());
        audioManager_.Initialize(resourceLoader_.Sounds());
        // potential later use: resourceLoader_.Enemies()
        std::cerr << "Loaded resources: items=" << resourceLoader_.Items().size()
                  << " sounds=" << resourceLoader_.Sounds().size()
                  << " enemies=" << resourceLoader_.Enemies().size() << "\n";
    } else {
        std::cerr << "ResourceLoader failed to load resources/" << std::endl;
    }
}

void GameEngine::Run() {
    bool running = true;

    while (running) {
        float currentTime = static_cast<float>(SDL_GetTicks()) / 1000.0f;
        float deltaTime = currentTime - lastTime_;
        lastTime_ = currentTime;

        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_QUIT) {
                running = false;
            }
            inputManager_.ProcessEvent(event);
        }

        inputState_ = inputManager_.State();
        if (inputState_.startPressed && gameState_ == GameState::Title) {
            StartGame();
            inputState_.startPressed = false;
            inputManager_.ResetStart();
        }

        if (gameState_ == GameState::Playing) {
            Update(deltaTime);
        }

        Render();
    }
}

void GameEngine::ProcessEvents() {
    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        if (event.type == SDL_QUIT) {
            gameState_ = GameState::Title;
        }
        InputManager manager;
        manager.ProcessEvent(event);
    }
}

void GameEngine::Update(float deltaTime) {
    UpdatePlayer(deltaTime);
}

void GameEngine::Render() {
    if (rendererWrapper_ == nullptr) {
        return;
    }

    rendererWrapper_->SetDrawColor({0, 0, 0, 255});
    rendererWrapper_->Clear();

    if (titleScene_.IsVisible()) {
        int windowWidth = 1280;
        int windowHeight = 720;
        SDL_GetRendererOutputSize(rendererWrapper_->Native(), &windowWidth, &windowHeight);
        titleScene_.Render(rendererWrapper_->Native(), windowWidth, windowHeight);
    } else {
        std::string bodyFrame = GetBodyFrame();
        std::string headFrame = GetHeadFrame();
        SDL_Rect destination{
            static_cast<int>(player_.x - player_.width / 2),
            static_cast<int>(player_.y - player_.height / 2),
            player_.width,
            player_.height};
        bool flip = player_.facing == Direction::Left;

        rendererWrapper_->DrawAtlasFrame(characterAtlas_, bodyFrame, destination, flip);
        rendererWrapper_->DrawAtlasFrame(characterAtlas_, headFrame, destination, flip);
    }

    rendererWrapper_->Present();
}

void GameEngine::StartGame() {
    gameState_ = GameState::Playing;
    titleScene_.Hide();
}

void GameEngine::UpdatePlayer(float deltaTime) {
    bool moved = false;

    if (inputState_.left) {
        player_.x -= player_.speed * deltaTime;
        player_.facing = Direction::Left;
        moved = true;
    }
    if (inputState_.right) {
        player_.x += player_.speed * deltaTime;
        player_.facing = Direction::Right;
        moved = true;
    }
    if (inputState_.up) {
        player_.y -= player_.speed * deltaTime;
        player_.facing = Direction::Up;
        moved = true;
    }
    if (inputState_.down) {
        player_.y += player_.speed * deltaTime;
        player_.facing = Direction::Down;
        moved = true;
    }

    player_.moving = moved;
    player_.animationTime += moved ? deltaTime : 0.0f;

    if (player_.blinking) {
        player_.blinkTime += deltaTime;
        if (player_.blinkTime >= config_.blinkDuration) {
            player_.blinking = false;
            player_.blinkTime = 0.0f;
            player_.nextBlink = 2.0f;
        }
    } else {
        player_.nextBlink -= deltaTime;
        if (player_.nextBlink <= 0.0f) {
            player_.blinking = true;
            player_.blinkTime = 0.0f;
        }
    }
}

std::string GameEngine::GetBodyFrame() const {
    if (!player_.moving) {
        return "body_idle";
    }

    static const std::vector<std::string> walkDown = {"walk_down_0", "walk_down_1", "walk_down_2", "walk_down_3", "walk_down_4"};
    static const std::vector<std::string> walkRight = {"walk_right_0", "walk_right_1", "walk_right_2", "walk_right_3", "walk_right_4", "walk_right_5"};

    if (player_.facing == Direction::Left || player_.facing == Direction::Right) {
        const auto index = static_cast<size_t>(player_.animationTime / config_.frameSpeed) % walkRight.size();
        return walkRight[index];
    }

    const auto index = static_cast<size_t>(player_.animationTime / config_.frameSpeed) % walkDown.size();
    return walkDown[index];
}

std::string GameEngine::GetHeadFrame() const {
    std::string frameName;
    switch (player_.facing) {
        case Direction::Up: frameName = "head_back_1"; break;
        case Direction::Down: frameName = "head_forward_1"; break;
        case Direction::Left:
        case Direction::Right:
            frameName = "head_right_1";
            break;
    }

    if (player_.blinking) {
        auto position = frameName.find("_1");
        if (position != std::string::npos) {
            frameName.replace(position, 2, "_blink");
        }
    }

    return frameName;
}
