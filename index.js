require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

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
        const response = await axios.post(
            endpoint,
            { query, variables },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": accessToken,
                },
            }
        );

        const data = response.data;

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
