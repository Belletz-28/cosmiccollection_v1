// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
require("@nomiclabs/hardhat-ethers");

const hre = require("hardhat");

async function main() {
  const _contractURI = "ipfs-contract-metadata"
  const _splitter = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  const _hiddenMetadataUri ="https://hidden.json"
  const _royaltyFeesInBips = 750

  const AstroHelmetsV2 = await hre.ethers.getContractFactory("AstroHelmetsV2");
  const _AstroHelmetsV2 = await AstroHelmetsV2.deploy(_contractURI,_hiddenMetadataUri,_splitter,_royaltyFeesInBips);

  await _AstroHelmetsV2.deployed();
  const [owner] = await ethers.getSigners();
  console.log("Contract deployed to address:", _AstroHelmetsV2.address)
  console.log("OWNER: ",owner.address)
  const astrocontract = await hre.ethers.getContractAt("AstroHelmetsV2", _AstroHelmetsV2.address);
  const name = await astrocontract.functions.name()
  const symbol = await astrocontract.functions.symbol()
  console.log("Collection name: ",name)
  console.log("Collection symbol: ",symbol)
  await astrocontract.functions.setBaseURI("ipfs://jsabfnkjadbfajdbfiabfiudafbdaif/png/")
    
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
