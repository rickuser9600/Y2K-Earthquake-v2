const { expect } = require("chai");
const { ethers } = require("hardhat");
// const BigNumber = require("bignumber.js");
const { BigNumber } = ethers;
const { impersonates, depositVault, setupCoreProtocol, advanceNBlock } = require("./utils/utils.js");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {CarouselFactoryABI, ControllerABI} = require("./abi/abiCodes.js");


async function increaseTime(n) {
    await network.provider.send("evm_increaseTime", [24 * 60 * 60 * n]); // Increase time by one day
    await network.provider.send("evm_mine"); // Mine the next block

}

describe( "Y2K Earthquake V2" , function () {

    let controller;
    let carouselCreator;
    let carouselFactory;
    let timeLock;
    let CarouselFactoryAddress = "0xC3179AC01b7D68aeD4f27a19510ffe2bfb78Ab3e";
    let CarouselCreatorAddress = "0x773018D4D5eb0EaEF8aF903C30038ca15545068F";
    let ControllerAddress = "0xC0655f3dace795cc48ea1E2e7BC012c1eec912dC";
    let emissionTokenAddress = "0x65c936f008BC34fE819bce9Fa5afD9dc2d49977f";

    let ownerAddress = "0x45aA9d8B9D567489be9DeFcd085C6bA72BBf344F"
    let owner;
    
    let oracle = "0x50834f3163758fcc1df9973b6e91f0f0f0434ad3";  // USDC/USD Price Oracle
    let l2sequence = "0xFdB631F5EE196F0ed6FAa767959853A9F217697D";  //l2sequencer feeds address in artitrum
    let premium;
    let collateral;

    let premiumContract;
    let collateralContract;

    let marketId;
    let strike;
    let depositFee;
    let relayerFee;
    let premiumEmissions;
    let collatEmissions;
    let epochId;
    let nextEpochId;
    let collateralQueueLength;
    let premiumQueueLength;

    let DEPOSIT_AMOUNT = ethers.utils.parseEther("10");
    let PREMIUM_DEPOSIT_AMOUNT = ethers.utils.parseEther("2");
    let COLLAT_DEPOSIT_AMOUNT = ethers.utils.parseEther("10");
    let AMOUNT_AFTER_FEE = ethers.utils.parseEther("19.95");

    let begin;
    let end;
    let nextEpochBegin;
    let nextEpochEnd;
    let fee;

    let ADMIN;
    let USER;
    let USER2;
    let MIM = "0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A";        // USDC address in arbitrum
    let USDC = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";        // USDC address in arbitrum
    let WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";        // WETH address in arbitrum
    let TREASURY = "0x5c84CF4d91Dc0acDe638363ec804792bB2108258";    // Real Tresury address in CarouselFactory
    // let TREASURY = "0x1bf05Be2C1f069A323aF9157388822F0411583d8";    // my wallet address
    let UNDERLYING;
    let WethContract;

    let aToken;
    let bToken;


    beforeEach(async function() {
        [ADMIN, USER, USER2] = await ethers.getSigners();
        await impersonates([ownerAddress]);
        owner = await ethers.getSigner(ownerAddress);

        WethContract = await ethers.getContractAt('WETH', WETH);

        const TimeLock = await ethers.getContractFactory("TimeLock");
        timeLock = await TimeLock.deploy(ADMIN.address);
        await timeLock.deployed();

        //////////////////////////////////////////////////////////  Mainnet Address   ///////////////////////////////////////////////////////////////////////////
        
        controller = await ethers.getContractAt(ControllerABI, ControllerAddress); 
        console.log("controller", controller.address)
        
        carouselFactory = await ethers.getContractAt(CarouselFactoryABI, CarouselFactoryAddress);
        console.log("carouselFactory", carouselFactory.address)

        const treasury = await carouselFactory.treasury();
        console.log("treasury", treasury);
        
        /////////////////////////////////////////////////////////////   Creation Address   //////////////////////////////////////////////////////////////////////
        // const CarouselCreator = await ethers.getContractFactory("CarouselCreator");
        // carouselCreator = await CarouselCreator.deploy();
        // await carouselCreator.deployed();
        
        // const CarouselFactory = await ethers.getContractFactory("CarouselFactory",{
        //     libraries:{
        //         CarouselCreator : carouselCreator.address
        //     }
        // });
        // carouselFactory = await CarouselFactory.deploy(WETH, TREASURY, timeLock.address, emissionTokenAddress);
        // await carouselFactory.deployed();
        
        // const ControllerPeggedAssetV2 = await ethers.getContractFactory("ControllerPeggedAssetV2");
        // controller = await ControllerPeggedAssetV2.deploy(carouselFactory.address, l2sequence);
        // await controller.deployed();

        // await carouselFactory.whitelistController(controller.address, {gasLimit : 150000});

        // const AToken = await ethers.getContractFactory("AToken");
        // aToken = await AToken.deploy();
        // await aToken.deployed();
        
        // const BToken = await ethers.getContractFactory("BToken");
        // bToken = await BToken.deploy();
        // await bToken.deployed();
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        depositFee = 50;
        relayerFee = ethers.utils.formatUnits(2, 'gwei');

        const carouselMarketConfigurationCalldata= {
            token : USDC,
            strike : ethers.utils.parseEther("1"),
            oracle : oracle,
            underlyingAsset : WETH,
            name : "USD Coin",
            tokenURI : "USDC",
            controller : controller.address,
            relayerFee : 2,
            depositFee : depositFee,
            minQueueDeposit : ethers.utils.parseEther("1")
        }

        console.log("carouselMarketConfigurationCalldata", carouselMarketConfigurationCalldata);

        console.log("controller", await carouselFactory.controllers(controller.address));

        const marketId = await carouselFactory.getMarketId(
            carouselMarketConfigurationCalldata.token,
            carouselMarketConfigurationCalldata.strike,
            carouselMarketConfigurationCalldata.underlyingAsset
        );
        console.log("marketId", marketId);
        
        const marketIdVaults = await carouselFactory.marketIdToVaults(marketId, 0);
        console.log("marketIdVaults", marketIdVaults);

        const tx = await carouselFactory.connect(owner).createNewCarouselMarket(carouselMarketConfigurationCalldata, {gasLimit : 150000});
        const receipt = await tx.wait();
        
        const event = receipt.events.find((e) => e.event === "MarketCreated");
        marketId = event.args[0];
        premium = event.args[1];
        collateral = event.args[2];
        console.log("marketId", marketId)
        console.log("premium", premium)
        console.log("collateral", collateral)

        const marketIdInfo = await carouselFactory.getMarketInfo(marketId);

        premiumContract = await ethers.getContractAt('Carousel', premium);
        collateralContract = await ethers.getContractAt('Carousel', collateral);

        begin = await time.latest() + (5 * 24 * 60 * 60);
        end = await time.latest() + (8 * 24 * 60 * 60);
        fee = 50;
        premiumEmissions = ethers.utils.parseEther("1000");
        collatEmissions = ethers.utils.parseEther("100");

        const tx_epoch = await carouselFactory.createEpochWithEmissions(marketId, begin, end, fee, premiumEmissions, collatEmissions);
        const receipt_epoch = await tx_epoch.wait();

        const event_epoch = receipt_epoch.events.find((e) => e.event === "EpochCreatedWithEmissions");
        epochId = event_epoch.args[0];

        nextEpochBegin = uint40(block.timestamp - 10 hours);
        nextEpochEnd = uint40(block.timestamp - 5 hours);

        const mintWeth = ethers.utils.parseEther("100");
        await WethContract.connect(USER).deposit({value: mintWeth});
        console.log("before user balance", await WethContract.balanceOf(USER.address));

    })

    it("test end epoch with no depeg event", async function() {
        await increaseTime(9);
        await WethContract.connect(USER).approve(premium, DEPOSIT_AMOUNT);
        await WethContract.connect(USER).approve(collateral, DEPOSIT_AMOUNT);
        
        await premiumContract.connect(USER).deposit(epochId, DEPOSIT_AMOUNT, USER.address);
        await collateralContract.connect(USER).deposit(epochId, DEPOSIT_AMOUNT, USER.address);

        console.log("premium user balance", await premiumContract.balanceOf(USER.address, epochId));
        console.log("collateral user balance", await collateralContract.balanceOf(USER.address, epochId));
        expect(await premiumContract.balanceOf(USER.address, epochId)).to.be.equal(DEPOSIT_AMOUNT);
        expect(await collateralContract.balanceOf(USER.address, epochId)).to.be.equal(DEPOSIT_AMOUNT);
        
        await increaseTime(16);
        
        await controller.triggerEndEpoch(marketId, epochId);
        
        const premiumBalance = await premiumContract.connect(USER).previewWithdraw(epochId, DEPOSIT_AMOUNT);
        expect(premiumBalance).to.be.equal(0);
        console.log("premiumBalance", premiumBalance);
        
        const collateralBalance = await collateralContract.connect(USER).previewWithdraw(epochId, DEPOSIT_AMOUNT);
        expect(collateralBalance).to.be.equal(AMOUNT_AFTER_FEE);
        console.log("collateralBalance", collateralBalance);
        await premiumContract.connect(USER).withdraw(epochId, DEPOSIT_AMOUNT, USER.address, USER.address);
        await collateralContract.connect(USER).withdraw(epochId, DEPOSIT_AMOUNT, USER.address, USER.address);

        expect(await premiumContract.balanceOf(USER.address, DEPOSIT_AMOUNT)).to.be.equal(0);
        expect(await collateralContract.balanceOf(USER.address, DEPOSIT_AMOUNT)).to.be.equal(0);
        console.log("after premium balance", await premiumContract.balanceOf(USER.address, DEPOSIT_AMOUNT));
        console.log("after premium balance", await collateralContract.balanceOf(USER.address, DEPOSIT_AMOUNT));
        
    })

});