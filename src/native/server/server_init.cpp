#include <uWebSockets/src/App.h>
#include "rate_limit/limiter.h"


// bootstrap
// =================================





//==================================
// calling all plugin inside routes
// do not remove or modify it
//----------------------------------

#include "routes/native_routes.h"

void start_routes(uWS::App& app)
{
    register_native_routes(app);
}

//===================================


int main()
{
    uWS::App app;
    start_routes(app);

    app.listen(3000, [](auto* listen_socket) {

        if (listen_socket) {
            std::cout << "server started\n";
        }

    });

    app.run();
}