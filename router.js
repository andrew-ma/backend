const Router = require("@koa/router");
const router = new Router();
const tokens = require("./tokens.json");
const models = require("./models");

router.get("/:tokenId", async (ctx, next) => {
    const tokenURI = tokens[ctx.params.tokenId];
    // FAILURE: tokenId not in tokens.json file
    if (typeof tokenURI === "undefined") {
        ctx.status = 400;
        ctx.body = {
            error: `tokenId ${ctx.params.tokenId} does not exist`,
        };
        return;
    }

    // SUCCESS: if tokenId is in tokens.json file
    ctx.status = 200;
    ctx.body = {
        tokenId: ctx.params.tokenId,
        result: tokenURI,
    };
});

router.post("/:tokenId", async (ctx, next) => {
    ctx.body = ctx.request.body;
});

module.exports = router;
