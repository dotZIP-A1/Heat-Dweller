#pragma once

#include <string>
#include <vector>
#include <optional>
#include "ResourceTypes.h"

class ItemManager {
public:
    void Initialize(const std::vector<Item>& items) { items_ = items; }
    const std::vector<Item>& All() const { return items_; }
    std::optional<Item> GetById(const std::string& id) const;

private:
    std::vector<Item> items_;
};
