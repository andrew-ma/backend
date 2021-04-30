const Koa = require("koa");
const cors = require("@koa/cors");
const serve = require("koa-static");
const router = require("./router.js");

const app = new Koa();

const PORT = process.env.PORT || 4000;

console.log(`Running koa server on port ${PORT}...`);
app.use(cors()).use(serve("./images")).use(router.routes());

app.listen(PORT);
