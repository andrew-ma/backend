const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    class Metadata extends Model {
        // Class Methods (start with static)

        static async getTokenMetadata(tokenId) {
            const tokenMetadata = await Metadata.findOne({
                where: {
                    tokenId: tokenId,
                },
                attributes: ["tokenId", "name", "description", "image"],
            });

            if (tokenMetadata === null) {
                // FAILURE:
                console.log(`Got null metadata for ${tokenId}`);
                return null;
            }

            console.log("\n", tokenMetadata.toJSON(), "\n");
            return tokenMetadata.toJSON();
        }

        static async postTokenMetadata(tokenId, name, description, image) {
            // First, check to see if tokenId is already in database
            if ((await Metadata.findByPk(tokenId)) !== null) {
                // FAILURE: found tokenId in database
                return null;
            }

            // If tokenId not in database, add it to the database with the other details
            const tokenMetadata = await Metadata.create({
                tokenId: tokenId,
                name: name,
                description: description,
                image: image,
            });

            return { tokenId: tokenId };
        }

        // Instance Methods
    }

    Metadata.init(
        {
            // Model attributes are defined here
            tokenId: {
                type: DataTypes.INTEGER,
                unique: true,
                allowNull: false,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING,
                defaultValue: "",
                allowNull: false,
            },
            image: {
                type: DataTypes.STRING,
                allowNull: false,
            },
        },
        {
            // Other model options go here
            sequelize, // We need to pass the connection instance
        }
    );

    return Metadata;
};
