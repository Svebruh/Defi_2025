// scripts/deploy.js
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
  
    // Deploy the NFT contract
    const PokemonCardNFT = await ethers.getContractFactory("PokemonCardNFT");
    const nftContract = await PokemonCardNFT.deploy();
    await nftContract.waitForDeployment();
    console.log("PokemonCardNFT deployed to:", nftContract.target);
  
    // Deploy the marketplace contract with the NFT contract's address
    const PokemonCardMarket = await ethers.getContractFactory("PokemonCardMarket");
    const marketContract = await PokemonCardMarket.deploy(nftContract.target);
    await marketContract.waitForDeployment();
    console.log("PokemonCardMarket deployed to:", marketContract.target);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  