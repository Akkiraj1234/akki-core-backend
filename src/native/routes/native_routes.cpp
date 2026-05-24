#include "native_routes.h"
#include "rate_limit/limiter.h"



// rate limit per ip much smaller
// get asse have small
// health have small
// admin_login have small

void get_access_token( HttpResponse<false>* res, HttpRequest* req )
{
    
}


void get_sse( HttpResponse<false>* res, HttpRequest* req )
{
    
}


void health( HttpResponse<false>* res, HttpRequest* req )
{
    
}


void admin_login( HttpResponse<false>* res, HttpRequest* req )
{
    
}


void register_native_routes(App& app )
{
    app.get("/get_access_token", get_access_token);
    app.get("/get_sse", get_sse);
    app.get("/health", health);
    app.get("admin_login", admin_login);
}
