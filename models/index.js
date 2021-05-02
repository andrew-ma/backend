"use strict";

const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const Sequelize = require("sequelize");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development"; /* development, test, production */
const config = require(__dirname + "/../config/config.json")[env];
const db = {};

console.log(`Using env: "${env}"`);

let sequelize;
if (config.use_env_variable) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
    // sequelize = new Sequelize(config.database, config.username, config.password, config);
    console.log("Using config:", config);
    sequelize = new Sequelize(config);
}

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log("Connection has been established successfully");
    } catch (error) {
        console.error("Unable to connect to the database:", error);
    }
}

testConnection();

fs.readdirSync(__dirname)
    .filter((file) => {
        return file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js";
    })
    .forEach((file) => {
        const model = require(path.join(__dirname, file))(sequelize);
        db[model.name] = model;
        console.log(`Loaded model: "${model.name}"`);
    });

// Associating Models
Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
        console.log(`Associated "${modelName}" to db :`, modelName);
    }
});

/* Model synchronization
- If table doesn't exist in database, then create the table:  Model.sync()
- If table already exists in database, then drop the table and create it:  Model.sync({force: true})
- If table already exists in database, then make only necessary changes to database table to match the model:  Model.sync({alter: true})
*/

(async () => {
    const Metadata = db.Metadata;

    // to synchronize all the files
    await sequelize.sync({ force: true });

    console.log(`All models were synchronized successfully`);

    // Read from tokens.json, and load initial data into Database
    const TOKENS_JSON = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "tokens.json")));

    // // Build creates object that represents data that can be mapped to a database, but doesn't actually communicate to database
    // const metadataObj = Metadata.build(TOKENS_JSON);

    // // Save saves this instance in the database
    // await metadataObj.save();

    for (const [key, value] of Object.entries(TOKENS_JSON)) {
        const entryData = { tokenId: key, ...value };
        console.log("Adding entry:", entryData);
        // Create combines Build and Save, which creates object that represent data that can be mapped to a database, and then saves it to database
        const metadataObj = await Metadata.create(entryData);
    }
})();

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
