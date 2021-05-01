const Koa = require("koa");
const cors = require("@koa/cors");
const serve = require("koa-static");
const bodyParser = require("koa-bodyparser");
const router = require("./router.js");

const app = new Koa();

const PORT = process.env.PORT || 4000;

console.log(`Running koa server on port ${PORT}...`);
app.use(bodyParser());
app.use(cors());
app.use(serve("./images"));
app.use(router.routes());

app.listen(PORT);
