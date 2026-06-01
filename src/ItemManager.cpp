#include "ItemManager.h"

#include <algorithm>

std::optional<Item> ItemManager::GetById(const std::string& id) const {
    auto it = std::find_if(items_.begin(), items_.end(), [&](const Item& i){ return i.id == id; });
    if (it == items_.end()) return std::nullopt;
    return *it;
}
