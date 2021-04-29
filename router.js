const Router = require("@koa/router");
const router = new Router();
const tokens = require("./tokens.json");

router.get("/:tokenId", async (ctx, next) => {
    const tokenURI = tokens[ctx.params.tokenId];
    // FAILURE: tokenId not in tokens.json file
    if (typeof token === "undefined") {
        ctx.status = 400;
        ctx.body = {
            error: `tokenId ${ctx.params.tokenId} does not exist`,
        };
        return;
    }

    // SUCCESS: if tokenId is in tokens.json file
    ctx.body = {
        tokenId: ctx.params.tokenId,
        result: tokenURI,
    };
});

module.exports = router;
