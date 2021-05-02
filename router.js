const Router = require("@koa/router");
const router = new Router();

const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;

// Importing models that were loaded with index.js
const Metadata = require("./models").Metadata;

router.get("/:tokenId", async (ctx, next) => {
    const tokenIdParam = parseInt(ctx.params.tokenId);

    const tokenMetadata = await Metadata.getTokenMetadata(tokenIdParam);

    // FAILURE: tokenId primary key is not in database
    if (tokenMetadata === null) {
        ctx.status = 404;
        ctx.body = {
            error: `tokenId ${ctx.params.tokenId} does not exist`,
        };
        return;
    }

    // SUCCESS: if tokenId is in database
    ctx.status = 200;
    ctx.body = tokenMetadata;
});

router.post("/:tokenId", async (ctx, next) => {
    const body = ctx.request.body;
    console.log(`POST request body for Token ${body.tokenId}`, body, "\n");

    const newTokenIdObj = await Metadata.postTokenMetadata(body.tokenId, body.name, body.description, body.image);

    if (newTokenIdObj === null) {
        // FAILURE: token ID found in database
        ctx.status = 409; // Conflict
        ctx.body = {
            error: `tokenId ${body.tokenId} already exists`,
        };
        return;
    }

    // SUCCESS: tokenId is not in Token Database
    console.log(`Token ${body.tokenId}'s metadata was successfully saved to token database`);

    ctx.status = 201; // Created
    ctx.body = newTokenIdObj;
});

module.exports = router;
