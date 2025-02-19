const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Load environment variables
const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = process.env.CONTRACT_ADDRESS;
const contractABI = require('./ESIMPaymentABI.json');
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// Dummy eSIM provider API
const ESIM_API_URL = 'https://api.example-esim.com/purchase';
const axios = require('axios');
const path = require('path');

// Serve frontend
app.use(express.static(path.join(__dirname, 'frontend/build')));

// Endpoint to handle eSIM purchases
app.post('/buy-esim', async (req, res) => {
    try {
        const { userAddress, token, amount } = req.body;
        
        // Verify payment on blockchain
        const paymentReceived = await contract.balances(userAddress);
        if (paymentReceived < amount) {
            return res.status(400).json({ error: 'Payment not verified' });
        }

        // Call eSIM provider API to issue eSIM
        const esimResponse = await axios.post(ESIM_API_URL, { userAddress, amount });
        
        if (esimResponse.data.success) {
            return res.json({ success: true, esim: esimResponse.data.esimData });
        } else {
            return res.status(500).json({ error: 'Failed to issue eSIM' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve frontend for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
