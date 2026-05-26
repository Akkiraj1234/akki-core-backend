#include "native_routes.h"
#include "rate_limit/limiter.h"



// rate limit per ip much smaller
// get asse have small
// health have small
// admin_login have small

void get_access_token( HttpResponse<false>* res, HttpRequest* req )
{
    res->writeHeader("Content-Type", "application/json");
    res->end(R"({"token":"hx7us9n2x9s49sxo9sk"})");
}


void get_sse( HttpResponse<false>* res, HttpRequest* req )
{
    res->writeHeader("Content-Type", "application/json");
    res->end(R"({"token":"hx7us9n2x9s49sxo9sk"})");
}


void health( HttpResponse<false>* res, HttpRequest* req )
{
    res->writeHeader("Content-Type", "application/json");
    res->end(R"({"status":"ok"})");
}


void admin_login( HttpResponse<false>* res, HttpRequest* req )
{
    res->writeHeader("Content-Type", "application/json");
    res->end(
        R"({
            "token":"hx7us9n2x9s49sxo9sk",
            "refresh_token":"hs78sh8s8jji89j6esd"
        })"
    );
}


void register_native_routes(App& app )
{
    app.get("/get_access_token", get_access_token);
    app.get("/get_sse", get_sse);
    app.get("/health", health);
    app.get("/admin_login", admin_login);
}
