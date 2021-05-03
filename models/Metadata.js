const { Model, DataTypes, Op } = require("sequelize");
const { BigNumber } = require("@ethersproject/bignumber");

module.exports = (sequelize) => {
    class Metadata extends Model {
        // Class Methods (start with static)

        static async getTokenMetadata(tokenId) {
            if (BigNumber.isBigNumber(tokenId)) {
                tokenId = tokenId.toString();
            }

            const tokenMetadata = await Metadata.findOne({
                where: {
                    tokenId: tokenId,
                },
                attributes: ["tokenId", "name", "description", "image", "tokenOwner", "price"],
            });

            if (tokenMetadata !== null) {
                // SUCCESS: found metadata (entry not null) for this tokenId
                console.log(`Found Metadata for tokenId ${tokenId}`, tokenMetadata.toJSON(), "\n");
                return tokenMetadata.toJSON();
            } else {
                // FAILURE: no metadata for this tokenId
                console.log(`No metadata for tokenId ${tokenId}`);
                return null;
            }
        }

        static async postTokenMetadata(tokenId, name, description, image, tokenOwner, price) {
            if (BigNumber.isBigNumber(tokenId)) {
                tokenId = tokenId.toString();
            }

            if (BigNumber.isBigNumber(price)) {
                price = price.toString();
            }

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
                tokenOwner: tokenOwner,
                price: price,
            });
            return { tokenId: tokenId };
        }

        static async getAllEntries() {
            const AllTokenEntries = await Metadata.findAll({
                attributes: ["tokenId", "name", "description", "image", "tokenOwner", "price"],
                raw: true,
            });
            console.log(AllTokenEntries);
            return AllTokenEntries;
        }

        static async getAllEntriesByTokenOwner(tokenOwner) {
            const TokenOwnerEntries = await Metadata.findAll({
                where: {
                    tokenOwner: tokenOwner,
                },
                attributes: ["tokenId", "name", "description", "image", "tokenOwner", "price"],
                raw: true,
            });
            console.log(TokenOwnerEntries);
            return TokenOwnerEntries;
        }

        static async getEntriesBetweenTokenIds(startingTokenId, endTokenId) {
            if (BigNumber.isBigNumber(startingTokenId)) {
                startingTokenId = startingTokenId.toString();
            }
            if (BigNumber.isBigNumber(endTokenId)) {
                endTokenId = endTokenId.toString();
            }

            // Between startingTokenId AND endTokenId, inclusive both beginning and end values
            const TokenEntries = await Metadata.findAll({
                where: {
                    tokenId: {
                        [Op.between]: [startingTokenId, endTokenId],
                    },
                },
                attributes: ["tokenId", "name", "description", "image", "tokenOwner", "price"],
                raw: true,
            });

            console.log(TokenEntries);
            return TokenEntries;
        }

        // Instance Methods
    }

    Metadata.init(
        {
            // Model attributes are defined here
            tokenId: {
                type: DataTypes.BIGINT,
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
            tokenOwner: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            price: {
                type: DataTypes.BIGINT,
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
