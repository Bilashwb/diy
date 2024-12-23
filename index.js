require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch"); // Importing fetch for Node.js
const cors = require("cors"); // Importing cors middleware

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all origins (you can customize this)
app.use(cors());

// Middleware to parse incoming JSON requests
app.use(bodyParser.json());

// Route to create a draft order
app.post("/create-draft-order", async (req, res) => {
    const { shop, accessToken, lineItems } = req.body;

    if (!shop || !accessToken || !lineItems) {
        return res.status(400).json({ error: "Missing required fields: shop, accessToken, or lineItems" });
    }

    const endpoint = `https://${shop}/admin/api/2023-10/graphql.json`;

    const query = `
        mutation CreateDraftOrder($input: DraftOrderInput!) {
            draftOrderCreate(input: $input) {
                draftOrder {
                    id
                    invoiceUrl
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `;

    const variables = {
        input: {
            lineItems: lineItems.map(item => ({
                variantId: item.variantId,
                quantity: item.quantity,
                customAttributes: item.customAttributes || [],
            })),
            note: "Created via API",
        },
    };

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": accessToken,
            },
            body: JSON.stringify({ query, variables }),
        });

        const data = await response.json();

        if (data.errors) {
            return res.status(500).json({ error: data.errors });
        }

        if (data.data.draftOrderCreate.userErrors.length > 0) {
            return res.status(400).json({ error: data.data.draftOrderCreate.userErrors });
        }

        res.status(200).json({
            message: "Draft order created successfully",
            draftOrder: data.data.draftOrderCreate.draftOrder,
        });
    } catch (error) {
        console.error("Error creating draft order:", error.message);
        res.status(500).json({ error: "Failed to create draft order" });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
