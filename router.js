const Router = require("@koa/router");
const router = new Router();
const mime = require("mime-types");
const { v4: uuidv4 } = require("uuid");

const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;

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
    const tokenIdParam = parseInt(ctx.params.tokenId);

    const tokenMetadata = await Metadata.getTokenMetadata(tokenIdParam);

    // FAILURE: tokenId primary key is not in database
    if (tokenMetadata === null) {
        ctx.throw(400, `tokenId ${ctx.params.tokenId} does not exist`);
    }

    // SUCCESS: if tokenId is in database
    ctx.status = 200;
    ctx.body = tokenMetadata;
});

router.post("/token", async (ctx, next) => {
    /* Receives multipart form data with 
    imageFile:  will be saved to UPLOAD_DIR, and saved to DB field "image"
    assetName: saved to DB field "name"
    assetDescription: saved to DB field "description"
    tokenId: saved to DB field "tokenId"
    */
    console.log("Reached New Token Route");

    const ALLOWED_UPLOAD_FILE_MIMETYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    // Make sure there is a file in request
    const formFiles = ctx.request.files;
    if (Object.entries(formFiles).length === 0 || formFiles.imageFile === undefined) {
        ctx.throw(400, "imageFile not included with request");
    }

    const body = ctx.request.body;
    console.log("Body", body);

    // Required Form body: assetName, tokenId
    if (body.assetName === undefined || body.tokenId === undefined) {
        ctx.throw(400, "Required data: assetName, tokenId");
    }

    // assetDescription is optional, set to default empty string
    const description = body.assetDescription === undefined ? "" : body.assetDescription;

    const tokenId = parseInt(body.tokenId);
    if (tokenId === NaN || tokenId < 0 || tokenId > Number.MAX_SAFE_INTEGER) {
        ctx.throw(400, "TokenId is invalid");
    }
    const name = `${body.assetName}`;

    // Make sure tokenId does not exist in database before saving file
    if ((await Metadata.findByPk(tokenId)) !== null) {
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

    console.log("Saving values to database:", tokenId, name, description, fileURL);
    // Add metadata to database under primary key tokenId, and returns null if tokenId is already in database
    const newTokenIdObj = await Metadata.postTokenMetadata(tokenId, name, description, fileURL);

    if (newTokenIdObj === null) {
        // FAILURE: token ID found in database
        ctx.throw(409, `tokenId ${tokenId} already exists`); // CONFLICT
    }

    // SUCCESS: tokenId is not in Token Database
    console.log(`Token ${tokenId}'s metadata was successfully saved to token database`);

    ctx.status = 201; // Created
    ctx.body = newTokenIdObj;
});

module.exports = router;
