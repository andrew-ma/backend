const Koa = require("koa");
const cors = require("@koa/cors");
const serve = require("koa-static");
const bodyParser = require("koa-bodyparser");
const swagger = require("swagger2");
const { ui, validate } = require("swagger2-koa");
const router = require("./router.js");

const swaggerDocument = swagger.loadDocumentSync("api.yaml");

const app = new Koa();

const PORT = process.env.PORT || 4000;

console.log(`Running koa server on port ${PORT}...`);
app.use(bodyParser());
app.use(cors());
app.use(serve("./images"));
app.use(ui(swaggerDocument, "/swagger"));
app.use(validate(swaggerDocument));
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT);
