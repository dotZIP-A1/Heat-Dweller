#include "AudioManager.h"
#include <algorithm>

std::optional<Sound> AudioManager::GetById(const std::string& id) const {
    auto it = std::find_if(sounds_.begin(), sounds_.end(), [&](const Sound& s){ return s.id == id; });
    if (it == sounds_.end()) return std::nullopt;
    return *it;
}
