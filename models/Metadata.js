const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    class Metadata extends Model {
        // Class Methods (start with static)

        static async getTokenMetadata(tokenId) {
            // findByPk gets only 1 entry from the table by Primary Key
            const tokenMetadata = await Metadata.findOne({
                where: {
                    tokenId: tokenId,
                },
                attributes: ["tokenId", "name", "description", "image"],
            });

            if (tokenMetadata === null) {
                console.log(`Got null metadata for ${tokenId}`);
                return null;
            }

            console.log("\n", tokenMetadata.toJSON(), "\n");
            return tokenMetadata.toJSON();
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
