// src/App.js
import React, { useState } from "react";
import { ethers } from "ethers";
import { Container, Paper, Typography, Button, Box } from "@mui/material";

import PokemonCardNFTArtifact from "./abi/PokemonCardNFT.json";
import PokemonCardMarketArtifact from "./abi/PokemonCardMarket.json";

import Section from "./components/Section";
import MintCard from "./MintCard";
import Inventory from "./Inventory";
import ListCard from "./ListCard";
import Marketplace from "./Marketplace";
import WithdrawFunds from "./WithdrawFunds";

// Replace with your deployed contract addresses
const nftAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const marketAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [nftContract, setNftContract] = useState(null);
  const [marketContract, setMarketContract] = useState(null);

  async function connectWallet() {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        setProvider(provider);
        setAccount(accounts[0]);

        const nft = new ethers.Contract(
          nftAddress,
          PokemonCardNFTArtifact.abi,
          signer
        );
        setNftContract(nft);

        const market = new ethers.Contract(
          marketAddress,
          PokemonCardMarketArtifact.abi,
          signer
        );
        setMarketContract(market);
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={6}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4, // Extra rounding for the main header
          textAlign: "center",
          backgroundColor: "#FFFFFF", // White background for the header
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
          Pokémon Card Trading Platform
        </Typography>
        {account ? (
          <Typography variant="body1" sx={{ mb: 2 }}>
            Connected as: <strong>{account}</strong>
          </Typography>
        ) : (
          <Button variant="contained" onClick={connectWallet}>
            Connect Wallet
          </Button>
        )}
      </Paper>

      {/* Show Mint + Inventory if NFT contract is loaded */}
      {nftContract && account && (
        <>
          <Section title="Mint Pokémon Cards">
            <MintCard nftContract={nftContract} account={account} />
          </Section>

          <Section title="My Inventory">
            <Inventory nftContract={nftContract} account={account} />
          </Section>
        </>
      )}

      {/* Show ListCard + Marketplace + Withdraw if Market contract is loaded */}
      {marketContract && (
        <>
          <Section title="List Your Card">
            <ListCard
              marketContract={marketContract}
              nftContract={nftContract}
              marketAddress={marketAddress}
            />
          </Section>

          <Section title="Marketplace Listings">
            <Marketplace
              marketContract={marketContract}
              nftContract={nftContract}
              nftAddress={nftAddress}
            />
          </Section>

          <Section title="Withdraw Funds">
            <WithdrawFunds marketContract={marketContract} />
          </Section>
        </>
      )}
    </Container>
  );
}

export default App;
