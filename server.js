const Koa = require("koa");
const cors = require("@koa/cors");
const serve = require("koa-static");
const koaBody = require("koa-body");
const swagger = require("swagger2");
const fs = require("fs");
const { ui, validate } = require("swagger2-koa");
const router = require("./router.js");
const env = process.env.NODE_ENV || "development"; /* development, test, production */
const config = require(__dirname + "/config/config.json")[env];

// 2mb is max file size
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const UPLOAD_DIR = config["upload_dir"];
const PORT = process.env.PORT || 4000;

const app = new Koa();

const swaggerDocument = swagger.loadDocumentSync("api.yaml");
// validate swagger file
if (!swagger.validateDocument(swaggerDocument)) {
    throw Error(`./api.yml does not conform to the Swagger 2.0 schema`);
}

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

// https://github.com/koajs/koa/wiki/Error-Handling
app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        // handle the maxFileSize error by koa-body parser
        if (err.message.startsWith("maxFileSize")) {
            ctx.status = 400;
            ctx.body = {
                error: "File upload error",
            };
        } else {
            ctx.status = err.status || 500;
            ctx.body = err.message;
        }

        console.error(ctx.status, ctx.body);
        ctx.app.emit("error", err, ctx);
    }
});
app.use(
    koaBody({
        multipart: true,
        json: true,
        formidable: {
            maxFileSize: MAX_FILE_SIZE,
            // default uploadDir is /tmp, so we don't have to copy file just rename it
            uploadDir: UPLOAD_DIR,
        },
    })
);
app.use(cors());
app.use(serve(UPLOAD_DIR));
app.use(ui(swaggerDocument, "/swagger"));
// app.use(validate(swaggerDocument));
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT);
console.log(`Running koa server on port ${PORT}...`);
