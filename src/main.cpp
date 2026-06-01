#include "GameEngine.h"

int main(int argc, char* argv[]) {
    GameEngine engine;
    if (!engine.Initialize()) {
        return EXIT_FAILURE;
    }

    engine.Run();
    return EXIT_SUCCESS;
}
