// src/App.js
import React, { useState } from "react";
import { ethers, parseEther } from "ethers";
import PokemonCardNFTArtifact from "./abi/PokemonCardNFT.json";
import PokemonCardMarketArtifact from "./abi/PokemonCardMarket.json";
import MintCard from "./MintCard";
import ListCard from "./ListCard";
import Inventory from "./Inventory";
import Marketplace from "./Marketplace";

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
        const nft = new ethers.Contract(nftAddress, PokemonCardNFTArtifact.abi, signer);
        setNftContract(nft);
        const market = new ethers.Contract(marketAddress, PokemonCardMarketArtifact.abi, signer);
        setMarketContract(market);
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Pokémon Card Trading Platform</h1>
      {account ? (
        <p>Connected as: {account}</p>
      ) : (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}

      {nftContract && account && (
        <>
          <MintCard nftContract={nftContract} account={account} />
          <Inventory nftContract={nftContract} account={account} />
        </>
      )}

      {marketContract && (
        <>
          <ListCard marketContract={marketContract} nftContract={nftContract} marketAddress={marketAddress} />
          <Marketplace marketContract={marketContract} nftContract={nftContract} />
        </>
      )}
    </div>
  );
}

export default App;
