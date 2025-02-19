const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

// Load environment variables
const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = process.env.CONTRACT_ADDRESS;
const contractABI = require('./ESIMPaymentABI.json');
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

const ESIM_API_URL = "https://esim-provider.com/api/purchase"; // API поставщика eSIM

// Endpoint для обработки покупки eSIM
app.post('/buy-esim', async (req, res) => {
    try {
        const { userAddress, amount } = req.body;
        
        // 1️⃣ Проверяем баланс в смарт-контракте
        const paymentReceived = await contract.getBalance(userAddress);
        const requiredAmount = ethers.parseEther(amount);

        if (paymentReceived < requiredAmount) {
            return res.status(400).json({ error: 'Payment not verified' });
        }

        console.log(`✅ Payment verified for ${userAddress}. Proceeding with eSIM purchase.`);

        // 2️⃣ Запрос в API eSIM-поставщика
        const esimResponse = await axios.post(ESIM_API_URL, {
            userAddress: userAddress,
            quantity: 1 // Можно менять на нужное количество eSIM
        });

        if (esimResponse.data.success) {
            console.log(`🎉 eSIM successfully issued for ${userAddress}`);
            return res.json({ success: true, esimCode: esimResponse.data.esimCode });
        } else {
            console.error(`❌ Error purchasing eSIM: ${esimResponse.data.error}`);
            return res.status(500).json({ error: 'Failed to issue eSIM' });
        }

    } catch (error) {
        console.error(`❌ Server error:`, error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Запускаем сервер
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
