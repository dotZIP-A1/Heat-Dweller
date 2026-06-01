#include "ResourceLoader.h"
#include <filesystem>
#include <fstream>
#include <sstream>
#include <regex>
#include <unordered_map>
#include <system_error>
#include <nlohmann/json.hpp>
#include <iostream>

namespace fs = std::filesystem;

static std::string ReadFile(const std::string& path) {
    std::ifstream ifs(path);
    if (!ifs) return {};
    std::ostringstream ss;
    ss << ifs.rdbuf();
    return ss.str();
}

bool ResourceLoader::LoadAll(const std::string& resourcesPath) {
    if (!fs::exists(resourcesPath)) return false;

    for (auto& p : fs::recursive_directory_iterator(resourcesPath)) {
        if (!p.is_regular_file()) continue;
        auto ext = p.path().extension().string();
        if (ext == ".xml") {
            ParseFile(p.path().string());
        }
    }
    // emit processed JSON for scripts to consume
    fs::path base = resourcesPath;
    EnsureProcessedDir(base);

    nlohmann::json jitems = nlohmann::json::array();
    for (auto& it : items_) {
        nlohmann::json ji;
        ji["id"] = it.id;
        ji["name"] = it.name;
        ji["type"] = it.type;
        ji["properties"] = it.properties;
        jitems.push_back(ji);
    }
    WriteJson(base, "items.json", jitems);

    nlohmann::json jsounds = nlohmann::json::array();
    for (auto& s : sounds_) {
        nlohmann::json js;
        js["id"] = s.id;
        js["path"] = s.path;
        js["event"] = s.event;
        jsounds.push_back(js);
    }
    WriteJson(base, "sounds.json", jsounds);

    nlohmann::json jenemies = nlohmann::json::array();
    for (auto& e : enemies_) {
        nlohmann::json je;
        je["id"] = e.id;
        je["name"] = e.name;
        je["health"] = e.health;
        je["properties"] = e.properties;
        jenemies.push_back(je);
    }
    WriteJson(base, "enemies.json", jenemies);

    return true;
}

static void EnsureProcessedDir(const fs::path& base) {
    fs::path proc = base / "processed";
    std::error_code ec;
    if (!fs::exists(proc) && !fs::create_directories(proc, ec)) {
        std::cerr << "Failed to create processed dir: " << ec.message() << std::endl;
    }
}

// Helper to write JSON processed data so scripts can read structured data
static void WriteJson(const fs::path& base, const std::string& name, const nlohmann::json& j) {
    fs::path out = base / "processed" / name;
    std::ofstream ofs(out);
    if (!ofs) {
        std::cerr << "Failed to write " << out.string() << std::endl;
        return;
    }
    ofs << j.dump(2);
}


void ResourceLoader::ParseFile(const std::string& path) {
    auto content = ReadFile(path);
    if (content.empty()) return;

    // Heuristic: choose parser based on filename
    auto p = path.find_last_of("/\\");
    std::string filename = (p==std::string::npos) ? path : path.substr(p+1);
    if (filename.find("item") != std::string::npos || filename.find("items") != std::string::npos) {
        ParseItems(content);
    } else if (filename.find("audio") != std::string::npos || filename.find("sound") != std::string::npos) {
        ParseSounds(content);
    } else if (filename.find("enemy") != std::string::npos || filename.find("enemies") != std::string::npos) {
        ParseEnemies(content);
    } else {
        // try all parsers conservatively
        ParseItems(content);
        ParseSounds(content);
        ParseEnemies(content);
    }
}

static std::unordered_map<std::string,std::string> ParseAttributes(const std::string& attrStr) {
    std::unordered_map<std::string,std::string> out;
    std::regex attrRe(R"((\w+)\s*=\s*"([^"]*)")");
    auto begin = std::sregex_iterator(attrStr.begin(), attrStr.end(), attrRe);
    auto end = std::sregex_iterator();
    for (auto it = begin; it != end; ++it) {
        out[(*it)[1].str()] = (*it)[2].str();
    }
    return out;
}

void ResourceLoader::ParseItems(const std::string& content) {
    // match <item ...> ... </item> and self-closing <item .../>
    std::regex itemRe(R"(<item([^>/]*?)(?:/?>)(?:([^<]*?)</item>)?)", std::regex::icase);
    auto begin = std::sregex_iterator(content.begin(), content.end(), itemRe);
    auto end = std::sregex_iterator();
    for (auto it = begin; it != end; ++it) {
        std::string attrStr = (*it)[1].str();
        std::string inner = (*it)[2].str();
        auto attrs = ParseAttributes(attrStr);
        Item itdata;
        if (attrs.count("id")) itdata.id = attrs["id"];
        if (attrs.count("name")) itdata.name = attrs["name"];
        if (attrs.count("type")) itdata.type = attrs["type"];
        // store other attributes as properties
        for (auto& kv : attrs) {
            if (kv.first=="id"||kv.first=="name"||kv.first=="type") continue;
            itdata.properties[kv.first] = kv.second;
        }
        if (!inner.empty()) itdata.properties["description"] = inner;
        items_.push_back(std::move(itdata));
    }
}

void ResourceLoader::ParseSounds(const std::string& content) {
    std::regex soundRe(R"(<sound([^>/]*?)(?:/?>)(?:([^<]*?)</sound>)?)", std::regex::icase);
    auto begin = std::sregex_iterator(content.begin(), content.end(), soundRe);
    auto end = std::sregex_iterator();
    for (auto it = begin; it != end; ++it) {
        std::string attrStr = (*it)[1].str();
        auto attrs = ParseAttributes(attrStr);
        Sound s;
        if (attrs.count("id")) s.id = attrs["id"];
        if (attrs.count("path")) s.path = attrs["path"];
        if (attrs.count("event")) s.event = attrs["event"];
        sounds_.push_back(std::move(s));
    }
}

void ResourceLoader::ParseEnemies(const std::string& content) {
    std::regex enemyRe(R"(<enemy([^>/]*?)(?:/?>)(?:([^<]*?)</enemy>)?)", std::regex::icase);
    auto begin = std::sregex_iterator(content.begin(), content.end(), enemyRe);
    auto end = std::sregex_iterator();
    for (auto it = begin; it != end; ++it) {
        std::string attrStr = (*it)[1].str();
        std::string inner = (*it)[2].str();
        auto attrs = ParseAttributes(attrStr);
        Enemy e;
        if (attrs.count("id")) e.id = attrs["id"];
        if (attrs.count("name")) e.name = attrs["name"];
        if (attrs.count("health")) e.health = std::stoi(attrs["health"]);
        for (auto& kv : attrs) {
            if (kv.first=="id"||kv.first=="name"||kv.first=="health") continue;
            e.properties[kv.first] = kv.second;
        }
        if (!inner.empty()) e.properties["description"] = inner;
        enemies_.push_back(std::move(e));
    }
}
