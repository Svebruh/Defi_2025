// src/App.js
import React, { useState, useEffect } from "react";
import { ethers, parseEther } from "ethers"; // Removed Web3Provider
import PokemonCardNFTArtifact from "./abi/PokemonCardNFT.json";
import PokemonCardMarketArtifact from "./abi/PokemonCardMarket.json";
import MintCard from "./MintCard";
import ListCard from "./ListCard";
import Inventory from "./Inventory";



// Replace with your deployed contract addresses
const nftAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const marketAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [nftContract, setNftContract] = useState(null);
  const [marketContract, setMarketContract] = useState(null);
  const [cards, setCards] = useState([]);

  async function connectWallet() {
    if (window.ethereum) {
      // Use BrowserProvider instead of Web3Provider
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      setProvider(provider);
      const account = await signer.getAddress();
      setAccount(account);

      // Initialize NFT and Marketplace contracts
      const nft = new ethers.Contract(nftAddress, PokemonCardNFTArtifact.abi, signer);
      setNftContract(nft);
      const market = new ethers.Contract(marketAddress, PokemonCardMarketArtifact.abi, signer);
      setMarketContract(market);
    } else {
      alert("Please install MetaMask!");
    }
  }

  useEffect(() => {
    if (marketContract) {
      marketContract.on("Listed", (seller, nftAddr, tokenId, price, isAuction, auctionEnd) => {
        console.log("Item listed:", tokenId.toString());
      });
      marketContract.on("Sale", (buyer, nftAddr, tokenId, price) => {
        console.log("Item sold:", tokenId.toString());
      });
    }
    return () => {
      if (marketContract) {
        marketContract.removeAllListeners("Listed");
        marketContract.removeAllListeners("Sale");
      }
    };
  }, [marketContract]);

  async function listCard(tokenId, price, isAuction, auctionDuration) {
    const priceInWei = parseEther(price);
    const tx = await marketContract.listItem(tokenId, priceInWei, isAuction, auctionDuration);
    await tx.wait();
    console.log("Card listed!");
  }

  async function buyCard(tokenId, price) {
    const priceInWei = parseEther(price);
    const tx = await marketContract.buyItem(tokenId, { value: priceInWei });
    await tx.wait();
    console.log("Card bought!");
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Pokémon Card Trading Platform</h1>
      {account ? (
        <p>Connected as: {account}</p>
      ) : (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}

      <section>
        <h2>Marketplace</h2>
        {cards.length === 0 ? (
          <p>No cards available.</p>
        ) : (
          cards.map((card, index) => (
            <div key={index} style={{ border: "1px solid #ccc", margin: "10px", padding: "10px" }}>
              <p>Token ID: {card.tokenId}</p>
              <p>Price: {card.price} ETH</p>
              <button onClick={() => buyCard(card.tokenId, card.price)}>Buy</button>
            </div>
          ))
        )}
      </section>
      {nftContract && account && (
        <>
          <MintCard nftContract={nftContract} account={account} />
          <Inventory nftContract={nftContract} account={account} />
        </>
      )}
      {marketContract && <ListCard marketContract={marketContract} />}
    </div>
  );
}

export default App;
