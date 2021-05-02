const Router = require("@koa/router");
const router = new Router();

const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;

// Importing models that were loaded with index.js
const Metadata = require("./models").Metadata;

router.get("/:tokenId", async (ctx, next) => {
    const tokenIdParam = parseInt(ctx.params.tokenId);

    try {
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

        console.log(`${next}`);
    } catch (error) {
        console.error(error);
        next(error);
    }
});

router.post("/:tokenId", async (ctx, next) => {
    const body = ctx.request.body;
    console.log(`POST request body for Token ${body.tokenId}`, body, "\n");

    try {
        const TOKENS_FILE_DATA = await fsPromises.readFile(path.join(__dirname, "tokens.json"));
        const TOKENS_DB = JSON.parse(TOKENS_FILE_DATA);
        // FAILURE: tokenId in POST body already exists in the Token Database
        if (TOKENS_DB[body.tokenId] !== undefined) {
            ctx.status = 409; // Conflict
            ctx.body = {
                error: `tokenId ${body.tokenId} already exists`,
            };
            return;
        }

        // SUCCESS: tokenId is not in Token Database
        // Write to Token database
        TOKENS_DB[body.tokenId] = {
            name: body.name,
            description: body.description,
            image: body.image,
        };

        await fsPromises.writeFile(path.join(__dirname, "tokens.json"), JSON.stringify(TOKENS_DB));

        // Success Case, the file was saved
        console.log(`Token ${body.tokenId}'s metadata was successfully saved to token database`);

        ctx.status = 201; // Created
        ctx.body = {
            tokenId: body.tokenId,
        };
    } catch (error) {
        console.error(error);
        next(error);
    }
    return;
});

module.exports = router;
