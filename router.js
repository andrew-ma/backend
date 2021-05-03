const Router = require("@koa/router");
const router = new Router();
const mime = require("mime-types");
const { v4: uuidv4 } = require("uuid");

const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;
const { BigNumber } = require("@ethersproject/bignumber");

// Importing models that were loaded with index.js
const Metadata = require("./models").Metadata;

const env = process.env.NODE_ENV || "development"; /* development, test, production */
const config = require(__dirname + "/config/config.json")[env];

const UPLOAD_DIR = config["upload_dir"];
const WEB_ROOT = config["web_root"];

function getTodayDate() {
    const dateObj = new Date(Date.now());

    // adjust 0 before single digit date
    const date = ("0" + dateObj.getDate()).slice(-2);

    // current month
    const month = ("0" + (dateObj.getMonth() + 1)).slice(-2);

    // current year
    const year = dateObj.getFullYear();

    // YYYY-MM-DD format
    return `${year}-${month}-${date}`;
}

router.get("/token/:tokenId", async (ctx, next) => {
    let tokenIdParam = null;
    try {
        tokenIdParam = BigNumber.from(ctx.params.tokenId);
        tokenIdParam = tokenIdParam.toString();
    } catch (error) {
        ctx.throw(400, `Invalid token ID ${tokenIdParam}`);
    }

    const tokenMetadata = await Metadata.getTokenMetadata(tokenIdParam);

    // FAILURE: tokenId primary key is not in database
    if (tokenMetadata === null) {
        ctx.throw(400, `tokenId ${ctx.params.tokenId} does not exist`);
    }

    // SUCCESS: if tokenId is in database
    ctx.status = 200;
    ctx.body = tokenMetadata;
});

router.get("/tokens/", async (ctx, next) => {
    // Get All Tokens between Start and End query params
    console.log(ctx.query);
    if (ctx.query.start === undefined || ctx.query.end === undefined) {
        if (ctx.query.owner === undefined) {
            // If neither start, end, nor owner are passed, then we get all entries
            const AllEntriesArray = await Metadata.getAllEntries();
            ctx.status = 200;
            ctx.body = AllEntriesArray;
        } else {
            const TokenEntriesArray = await Metadata.getAllEntriesByTokenOwner(ctx.query.owner);
            ctx.status = 200;
            ctx.body = TokenEntriesArray;
        }
    } else {
        let start = null;
        let end = null;
        try {
            start = BigNumber.from(ctx.query.start);
            end = BigNumber.from(ctx.query.end);

            start = start.toString();
            end = end.toString();
        } catch (error) {
            ctx.throw(400, `Query params start and end must be numbers`);
        }

        const TokenEntriesArray = await Metadata.getEntriesBetweenTokenIds(start, end);
        ctx.status = 200;
        ctx.body = TokenEntriesArray;
    }
});

router.post("/token", async (ctx, next) => {
    /* Receives multipart form data with 
    imageFile:  will be saved to UPLOAD_DIR, and saved to DB field "image"
    assetName: saved to DB field "name"
    assetDescription: saved to DB field "description"
    tokenId: saved to DB field "tokenId"
    
    tokenOwner: saved to DB field "tokenOwner"
    assetPrice: saved to DB field "price"
    */

    const ALLOWED_UPLOAD_FILE_MIMETYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    // Make sure there is a file in request
    const formFiles = ctx.request.files;
    if (Object.entries(formFiles).length === 0 || formFiles.imageFile === undefined) {
        ctx.throw(400, "imageFile not included with request");
    }

    const body = ctx.request.body;
    console.log("Body", body);

    // Required Form body: assetName, tokenId, assetPrice, tokenOwner
    if (body.assetName === undefined || body.tokenId === undefined || body.assetPrice === undefined || body.tokenOwner === undefined) {
        ctx.throw(400, "Required data: assetName, tokenId, assetPrice, tokenOwner");
    }

    // assetDescription is optional, set to default empty string
    const description = body.assetDescription === undefined ? "" : body.assetDescription;

    let tokenId = null;
    try {
        tokenId = BigNumber.from(body.tokenId);
        if (tokenId.lt(0)) {
            throw new Error("tokenId Must be >= 0");
        }
    } catch (error) {
        ctx.throw(400, `TokenId ${body.tokenId} is invalid:  ${error.message}`);
    }

    let assetPrice = null;
    try {
        assetPrice = BigNumber.from(body.assetPrice);
        if (assetPrice.lt(0)) {
            throw new Error("assetPrice Must be >= 0");
        }
    } catch (error) {
        ctx.throw(400, `assetPrice ${body.assetPrice} is invalid: ${error.message}`);
    }

    const name = `${body.assetName}`;
    const tokenOwner = `${body.tokenOwner}`;

    // Make sure tokenId does not exist in database before saving file
    console.log(`${typeof tokenId}`);
    if ((await Metadata.findByPk(tokenId.toString())) !== null) {
        // FAILURE: found tokenId in database
        ctx.throw(409, `tokenId ${tokenId} already exists`); // CONFLICT
    }

    ///////////////////////////////////////////////////////////////////////////

    // Save uploaded imageFile to UPLOAD_DIR
    // imageFile is the key in the form (must match frontend formData key)
    const { path: filepath, name: filename, type } = formFiles.imageFile;
    console.log("File Upload Details:", filepath, filename, type);

    if (!ALLOWED_UPLOAD_FILE_MIMETYPES.includes(type)) {
        ctx.throw(415, `Invalid filetype ${type} for uploaded file ${filename}`); // Unsupported Media Type
    }

    // Get file extension that corresponds to that mimetype
    const fileExtension = mime.extension(type);

    // Uploaded files directory was set in koa-body to the UPLOAD_DIR, so we rename it to a unique UUID filename
    // this saves us from having to copy from tmp folder
    // we also want to store each file in a folder with today's date, in case of collisions
    const saveFileName = `${uuidv4()}.${fileExtension}`;
    const todayDate = getTodayDate();
    const todayUploadsDir = path.join(UPLOAD_DIR, todayDate);
    if (!fs.existsSync(todayUploadsDir)) {
        fs.mkdirSync(todayUploadsDir, 0744);
    }
    const saveFilePath = path.join(todayUploadsDir, saveFileName);
    await fsPromises.rename(filepath, saveFilePath);

    // not using saveFilePath since that uses the local system file path separators
    const fileURL = `${WEB_ROOT}/${todayDate}/${saveFileName}`;
    console.log("Successfully saved file:", fileURL);

    console.log("Saving values to database:", tokenId, name, description, fileURL, tokenOwner, assetPrice);

    // Add metadata to database under primary key tokenId, and returns null if tokenId is already in database
    let newTokenObj = null;
    try {
        newTokenIdObj = await Metadata.postTokenMetadata(tokenId.toString(), name, description, fileURL, tokenOwner, assetPrice.toString());
    } catch (error) {
        ctx.throw(400, `Values: ${tokenId}, ${name}, ${description}, ${fileURL}: ${error.message}`);
    }

    if (newTokenIdObj === null) {
        // FAILURE: found entry in database
        ctx.throw(409, `Existing entry in token Database for ${tokenId}`);
    } else {
        // SUCCESS: tokenId is not in Token Database
        console.log(`Token ${tokenId}'s metadata was successfully saved to token database`);
        ctx.status = 201; // Created
        ctx.body = newTokenIdObj;
    }
});

module.exports = router;
