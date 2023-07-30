const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");


describe("AstroHelmetsV2", function () {
  let contract;
  let owner;
  const _contractURI = "ipfs-contract-metadata"
  const _splitter = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  const _hiddenMetadataUri = "https://hidden.json"
  const _royaltyFeesInBips = 750

  beforeEach(async function () {
    // Create the smart contract object to test from
    [owner,externalUser] = await ethers.getSigners(0);
    const TestContract = await ethers.getContractFactory("AstroHelmetsV2");
    contract = await TestContract.deploy(_contractURI, _hiddenMetadataUri, _splitter, _royaltyFeesInBips);

  });

  it('Check initial data', async function () {
    expect(await contract.name()).to.equal("Cosmic Collection: Astro  Helmets");
    expect(await contract.symbol()).to.equal("CCSH");
    expect(await contract.SPACE_HELMETS_SALE_PRICE()).to.equal(80000000000000000n);
    expect(await contract.MAX_SPACE_HELMETS_NFT()).to.equal(10000);
    expect(await contract.MAX_SPACE_HELMETS_PURCHASE()).to.equal(20);
    expect(await contract.hiddenMetadataUri()).to.equal(_hiddenMetadataUri);
    expect(await contract.revealed()).to.equal(false);

    await expect(contract.tokenURI(1)).to.be.revertedWith('ERC721Metadata: URI query for nonexistent token');
  });

  it('Owner only functions', async function () {
    await expect(contract.connect(externalUser).setRevealed(true, "INVALID_URI")).to.be.revertedWith('Ownable: caller is not the owner');
    await expect(contract.connect(externalUser).setHiddenMetadataUri('INVALID_URI')).to.be.revertedWith('Ownable: caller is not the owner');
    await expect(contract.connect(externalUser).setContractURI('INVALID_CONTRACT_URI')).to.be.revertedWith('Ownable: caller is not the owner');
    await expect(contract.connect(externalUser).setBaseExtension('INVALID_SUFFIX')).to.be.revertedWith('Ownable: caller is not the owner');
    await expect(contract.connect(externalUser).setBaseURI('INVALID_SUFFIX')).to.be.revertedWith('Ownable: caller is not the owner');
    await expect(contract.connect(externalUser).freezeMetadata()).to.be.revertedWith('Ownable: caller is not the owner')
    await expect(contract.connect(externalUser).startPublicSale(120)).to.be.revertedWith('Ownable: caller is not the owner')
    await expect(contract.connect(externalUser).stopPublicSale()).to.be.revertedWith('Ownable: caller is not the owner')
    await expect(contract.connect(externalUser).setDefaultRoyalty(externalUser.address,500)).to.be.revertedWith('Ownable: caller is not the owner')
    await expect(contract.connect(externalUser).withdraw()).to.be.revertedWith('Ownable: caller is not the owner');
  });
  /*
  it("Owner should set default royalties", async function () {
    await contract.setDefaultRoyalty(externalUser.address,500)
    expect(contract.RoyaltyInfo()).to.equal(500)

  });*/
  it("Owner should set base uri", async function () {
    await contract.functions.setBaseURI("https://metadata.cosmiccollection.com/json/");
    let baseUri = await contract.baseURI().then(
      toString()
    );
    expect(baseUri).to.equal("https://metadata.cosmiccollection.com/json/");
  });

  it("Owner should set correct hidden uri", async function () {
    await contract.functions.setHiddenMetadataUri("new MetadataUri")
    let hiddenMetadataUri = await contract.hiddenMetadataUri().then(
      toString()
    );
    expect("new MetadataUri").to.equal(hiddenMetadataUri);
  });

  it("Owner should set correct contract uri", async function () {
    await contract.functions.setContractURI("new contractURI")
    let contractURI = await contract.contractURI().then(
      toString()
    );
    expect("new contractURI").to.equal(contractURI);
  });

  it("Owner should set correct base exstension", async function () {
    await contract.functions.setBaseExtension(".xml")
    let baseExtension = await contract.baseExtension().then(
      toString()
    );
    expect(".xml").to.equal(baseExtension);
  });

  it("Owner should reveal metadata", async function () {
    await contract.functions.setRevealed(true, "new baseURI")
    let revealed = await contract.revealed().then(
      toString()
    );
    expect(true).to.equal(revealed)
  });

  it("Owner should freeze metadata after reveal", async function () {
    await contract.functions.setRevealed(true, "new baseURI")
    let revealed = await contract.revealed().then(
      toString()
    );
    await contract.functions.freezeMetadata()
    let isFrozen = await contract.isFrozen().then(
      toString()
    );
    expect(true).to.equal(revealed)
    expect(true).to.equal(isFrozen);
  });

  it("Owner should start public sale if not active", async function () {
    let duration = 120 //sec
    let publicSaleState = await contract.publicSaleActive().then(
      toString()
    );
    if (false == publicSaleState) {
      await contract.functions.startPublicSale(duration)
      let publicSaleDuration = await contract.publicSaleDuration().then(
        toString()
      );
      let publicSaleStartTime = await contract.publicSaleStartTime().then(
        toString()
      );
      let publicSaleActive = await contract.publicSaleActive().then(
        toString()
      );
      let revealTime = await contract.revealTime().then(
        toString()
      );
      expect(120).to.equal(publicSaleDuration)
      expect((await time.latest())).to.equal(publicSaleStartTime);
      expect(true).to.equal(publicSaleActive)
      expect((await time.latest()) + duration + 172800).to.equal(revealTime);
    }


  });
  it("Owner should stop public sale if active", async function () {
    let publicSaleState = await contract.publicSaleActive().then(
      toString()
    );
    if (true == publicSaleState) {
      await contract.functions.stopPublicSale()
      let publicSaleActive = await contract.publicSaleActive().then(
        toString()
      );
      expect(false).to.equal(publicSaleActive)
    }
  });

  it("People should get public sale elapsed time if active", async function () {
    let publicSaleState = await contract.publicSaleActive().then(
      toString()
    );
    if (true == publicSaleState) {
      let data = await contract.functions.getElapsedSaleTime()
      let publicSaleDuration = await contract.publicSaleDuration().then(
        toString()
      );
      let publicSaleStartTime = await contract.publicSaleStartTime().then(
        toString()
      );
      expect((publicSaleDuration+publicSaleStartTime)-(await time.latest()) ).to.equal(data)
    }
  });
     
  it('Should handle public sale correctly', async function () {
    // Owner start sale
    await contract.connect(owner).startPublicSale(120)
    // Valuable MINT
    await contract.connect(externalUser).MINT_SPACE_HELMETS(2, {value:  ethers.BigNumber.from(await contract.SPACE_HELMETS_SALE_PRICE()).mul(2)});
    // Sending insufficient funds
    await expect(contract.connect(externalUser).MINT_SPACE_HELMETS(2, {value: ethers.BigNumber.from(await contract.SPACE_HELMETS_SALE_PRICE()).sub(1)})).to.be.revertedWith("Ether value sent is not correct");
    // Sending an invalid mint amount
    await expect(contract.connect(externalUser).MINT_SPACE_HELMETS(
      await (await contract.MAX_SPACE_HELMETS_PURCHASE()) +1),
      {value: ethers.BigNumber.from(await contract.SPACE_HELMETS_SALE_PRICE()).mul(await contract.MAX_SPACE_HELMETS_PURCHASE() + 1)},
    ).to.be.revertedWith("Requested number exceeds maximum");
  });

  it('Should check supply limit correctly', async function (){
    const maxMintAmountPerTx = await contract.MAX_SPACE_HELMETS_PURCHASE()
    const maxSupply = await contract.MAX_SPACE_HELMETS_NFT()
    const transactions = maxSupply / maxMintAmountPerTx;
    const expectedTotalSupply = transactions * maxMintAmountPerTx;
    const lastMintAmount = maxSupply - expectedTotalSupply;
    expect(await contract.totalSupply()).to.equal(0);
    // Owner always start public sale
    await contract.connect(owner).startPublicSale(2000)
    // Bulk minting with 20 NFT per TX
    await Promise.all([...Array(transactions).keys()].map(async () => await contract.connect(externalUser).MINT_SPACE_HELMETS(maxMintAmountPerTx, {value: ethers.BigNumber.from(await contract.SPACE_HELMETS_SALE_PRICE()).mul(maxMintAmountPerTx)})));
    
    // Minting above suppply
    await expect(contract.connect(externalUser).MINT_SPACE_HELMETS(lastMintAmount + 1, {value: ethers.BigNumber.from(await contract.SPACE_HELMETS_SALE_PRICE()).mul(lastMintAmount + 1)})).to.be.revertedWith('Minting would exceed max supply');
    await expect(contract.connect(externalUser).MINT_SPACE_HELMETS(lastMintAmount + 20, {value: ethers.BigNumber.from(await contract.SPACE_HELMETS_SALE_PRICE()).mul(lastMintAmount + 20)})).to.be.revertedWith('Minting would exceed max supply');
    expect(await contract.totalSupply()).to.equal(expectedTotalSupply);
    // Verify ownership of all the NFTS
    expect(await contract.balanceOf(externalUser.address)).to.equal(expectedTotalSupply)
    for (const i of [...Array(transactions).keys()].reverse()) {
      expect(await contract.ownerOf(i)).to.equal(externalUser.address);
    }

    // Try to mint over max supply (after sold-out)
    await expect(contract.connect(externalUser).MINT_SPACE_HELMETS(1, {value: ethers.BigNumber.from(await contract.SPACE_HELMETS_SALE_PRICE())})).to.be.revertedWith('Minting would exceed max supply');

    expect(await contract.totalSupply()).to.equal(await contract.MAX_SPACE_HELMETS_NFT());
  });

  it('Should generate correct Token URI', async function () {
    const baseUri = 'https://aws.metadata/json/';
    const uriSuffix = '.json';
    const totalSupply = await contract.totalSupply();
    await contract.connect(owner).startPublicSale(120)
    await contract.connect(externalUser).MINT_SPACE_HELMETS(1, {value: ethers.BigNumber.from(await contract.SPACE_HELMETS_SALE_PRICE())})
    expect(await contract.tokenURI(0)).to.equal(await contract.hiddenMetadataUri());
    await contract.connect(owner).stopPublicSale()
    
    // Reveal collection
    await contract.setRevealed(true,'https://aws.metadata/json/');

    // Testing first and last minted tokens
    expect(await contract.tokenURI(0)).to.equal(`${baseUri}0${uriSuffix}`);
    expect(await contract.tokenURI(totalSupply)).to.equal(`${baseUri}${totalSupply}${uriSuffix}`);
  });

  it('Should let owner withdraw', async function () {

    await contract.startPublicSale(120)
    await contract.connect(externalUser).MINT_SPACE_HELMETS(20, {value: ethers.BigNumber.from(await contract.SPACE_HELMETS_SALE_PRICE()).mul(20)})
    const amountBeforeWithdrawal = ethers.BigNumber.from(await owner.getBalance()).toString()
    await contract.withdraw()
    const amountAfterWithdrawal = ethers.BigNumber.from(await owner.getBalance()).toString()
    expect(parseInt(amountAfterWithdrawal) > parseInt(amountBeforeWithdrawal)).to.true;
  });
  /*
  it('Should let owner withdraw ERC20', async function () {

    await contract.startPublicSale(120)
    await contract.connect(externalUser).MINT_SPACE_HELMETS(20, {value: ethers.BigNumber.from(await contract.SPACE_HELMETS_SALE_PRICE()).mul(20)})
    const amountBeforeWithdrawal = ethers.BigNumber.from(await owner.getBalance()).toString()
    await contract.withdrawTokens("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
    const amountAfterWithdrawal = ethers.BigNumber.from(await owner.getBalance()).toString()
    expect(parseInt(amountAfterWithdrawal) > parseInt(amountBeforeWithdrawal)).to.true;
  });
  */


})