#pragma once

#include <string>
#include <vector>
#include <optional>
#include "ResourceTypes.h"

class AudioManager {
public:
    void Initialize(const std::vector<Sound>& sounds) { sounds_ = sounds; }
    const std::vector<Sound>& All() const { return sounds_; }
    std::optional<Sound> GetById(const std::string& id) const;

private:
    std::vector<Sound> sounds_;
};
