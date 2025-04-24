import { Button, Container, Paper, Typography } from "@mui/material";
import { ethers } from "ethers";
import React, { useState, useEffect } from "react";

import PokemonCardMarketArtifact from "./abi/PokemonCardMarket.json";
import PokemonCardNFTArtifact from "./abi/PokemonCardNFT.json";

import Inventory from "./components/Inventory";
import ListCard from "./components/ListCard";
import Marketplace from "./components/Marketplace";
import MintCard from "./components/MintCard";
import Section from "./components/Section";
import WithdrawFunds from "./components/WithdrawFunds";
import PauseControls from "./components/PauseControls";

// Replace with your deployed contract addresses
const nftAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const marketAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

function App() {
  const [account, setAccount] = useState(null);
  const [nftContract, setNftContract] = useState(null);
  const [marketContract, setMarketContract] = useState(null);
  const [ownerAddress, setOwnerAddress] = useState(null);
  const [paused, setPaused] = useState(false);

  const isOwner = account && ownerAddress === account.toLowerCase();

  // Fetch owner and paused state, subscribe to pause/unpause
  useEffect(() => {
    if (!marketContract) return;
    let pausedListener, unpausedListener;
    (async () => {
      const owner = await marketContract.owner();
      setOwnerAddress(owner.toLowerCase());
      const isPaused = await marketContract.paused();
      setPaused(isPaused);
      pausedListener = () => setPaused(true);
      unpausedListener = () => setPaused(false);
      marketContract.on("Paused", pausedListener);
      marketContract.on("Unpaused", unpausedListener);
    })();
    return () => {
      if (marketContract) {
        marketContract.off("Paused", pausedListener);
        marketContract.off("Unpaused", unpausedListener);
      }
    };
  }, [marketContract]);

  async function connectWallet() {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    // If multiple providers, pick MetaMask
    const providerEngine =
      window.ethereum.providers && Array.isArray(window.ethereum.providers)
        ? window.ethereum.providers.find((p) => p.isMetaMask) || window.ethereum
        : window.ethereum;
    try {
      const accounts = await providerEngine.request({
        method: "eth_requestAccounts",
      });
      const provider = new ethers.BrowserProvider(providerEngine);
      const signer = await provider.getSigner();

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
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={6}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          textAlign: "center",
          backgroundColor: "#FFFFFF",
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
          {isOwner && (
            <Section title="Mint Pokémon Cards">
              <MintCard nftContract={nftContract} account={account} />
            </Section>
          )}

          <Section title="My Inventory">
            <Inventory nftContract={nftContract} account={account} />
          </Section>
        </>
      )}

      {/* Admin and marketplace sections */}
      {marketContract && (
        <>
          {isOwner && (
            <PauseControls
              marketContract={marketContract}
              account={account}
              paused={paused}
            />
          )}

          {paused && (
            <Paper sx={{ p: 2, mb: 3, backgroundColor: "#fff3cd" }}>
              <Typography color="warning.main" align="center">
                ⚠️ Marketplace is currently <strong>PAUSED</strong> by the
                owner.
              </Typography>
            </Paper>
          )}

          {!paused && (
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
                  account={account}
                />
              </Section>

              <Section title="Withdraw Funds">
                <WithdrawFunds
                  marketContract={marketContract}
                  account={account}
                />
              </Section>
            </>
          )}
        </>
      )}
    </Container>
  );
}

export default App;
