#pragma once
#include <uWebSockets/src/App.h>

using uWS::App;
using uWS::HttpResponse;
using uWS::HttpRequest;

// the main routes init entry point
void register_native_routes(App& app);

