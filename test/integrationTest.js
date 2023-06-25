const { expect } = require("chai");
const { ethers } = require("hardhat");
const { impersonates, depositVault, setupCoreProtocol, advanceNBlock } = require("./utils/utils.js");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {CarouselFactoryABI, ControllerABI} = require("./abi/abiCodes.js");


async function increaseTime(n) {
    await network.provider.send("evm_increaseTime", [24 * 60 * 60 * n]); // Increase time by one day
    await network.provider.send("evm_mine"); // Mine the next block

}

describe( "Y2K Earthquake V2" , function () {

    let controller;
    let vaultCreator;
    let vaultFactoryV2;
    let timeLock;
    let CarouselFactoryAddress = "0xC3179AC01b7D68aeD4f27a19510ffe2bfb78Ab3e";
    let CarouselCreatorAddress = "0x773018D4D5eb0EaEF8aF903C30038ca15545068F";
    let ControllerAddress = "0xC0655f3dace795cc48ea1E2e7BC012c1eec912dC";

    let ownerAddress = "0x45aA9d8B9D567489be9DeFcd085C6bA72BBf344F"
    
    let oracle = "0x50834f3163758fcc1df9973b6e91f0f0f0434ad3";  // USDC/USD Price Oracle
    let l2sequence = "0xFdB631F5EE196F0ed6FAa767959853A9F217697D";  //l2sequencer feeds address in artitrum
    let premium;
    let collateral;
    let depegPremium;
    let depegCollateral;   

    let premiumContract;
    let collateralContract;
    let depegPremiumContract;
    let depegCollateralContract;

    let marketId;
    let strike;
    let epochId;
    let depegMarketId;
    let depegStrike;
    let depegEpochId;
    let premiumShareValue;
    let collateralShareValue;
    let arbForkId;

    let AMOUNT_AFTER_FEE = ethers.utils.parseEther("19.95");
    let PREMIUM_DEPOSIT_AMOUNT = ethers.utils.parseEther("2");
    let COLLAT_DEPOSIT_AMOUNT = ethers.utils.parseEther("10");
    let DEPOSIT_AMOUNT = ethers.utils.parseEther("10");
    let DEALT_AMOUNT = ethers.utils.parseEther("20");

    let begin;
    let end;
    let fee;

    let ADMIN;
    let USER;
    let USER2;
    let MIM = "0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A";        // USDC address in arbitrum
    let USDC = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";        // USDC address in arbitrum
    let WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";        // WETH address in arbitrum
    let TREASURY = "0x1bf05Be2C1f069A323aF9157388822F0411583d8";    // my wallet address
    let UNDERLYING;
    let WethContract;

    let aToken;
    let bToken;


    beforeEach(async function() {
        [ADMIN, USER, USER2] = await ethers.getSigners();
        await impersonates([ownerAddress]);
        const signer = await ethers.getSigner(ownerAddress);

        WethContract = await ethers.getContractAt('WETH', WETH);
        console.log("WethContract", WethContract.address)
        
        const TimeLock = await ethers.getContractFactory("TimeLock");
        timeLock = await TimeLock.deploy(ADMIN.address);
        await timeLock.deployed();
        console.log("timeLock", timeLock.address)
        console.log("WETH", WETH)
        console.log("TREASURY", TREASURY)


        //////////////////////////////////////////////////////////  Mainnet Address   ///////////////////////////////////////////////////////////////////////////
        
        controller = await ethers.getContractAt(ControllerABI, ControllerAddress); 
        console.log("controller", controller.address)
        
        vaultFactoryV2 = await ethers.getContractAt(CarouselFactoryABI, CarouselFactoryAddress);
        console.log("vaultFactoryV2", vaultFactoryV2.address)

        const treasury = await vaultFactoryV2.treasury();
        console.log("treasury", treasury);
        
        /////////////////////////////////////////////////////////////   Creation Address   //////////////////////////////////////////////////////////////////////
        
        // const VaultV2Creator = await ethers.getContractFactory("VaultV2Creator");
        // vaultCreator = await VaultV2Creator.deploy();
        // await vaultCreator.deployed();
        // console.log("vaultCreator", vaultCreator.address)
        
        // const FactoryV2 = await ethers.getContractFactory("VaultFactoryV2");
        // vaultFactoryV2 = await FactoryV2.deploy(WETH, TREASURY, timeLock.address,{
        //     libraries:{
        //         // VaultV2Creator : CarouselFactoryAddress
        //         VaultV2Creator : vaultCreator.address
        //     }
        // });
        // await vaultFactoryV2.deployed();
        // console.log("vaultFactoryV2", vaultFactoryV2.address)
        
        // const ControllerPeggedAssetV2 = await ethers.getContractFactory("ControllerPeggedAssetV2");
        // controller = await ControllerPeggedAssetV2.deploy(vaultFactoryV2.address, l2sequence);
        // await controller.deployed();
        // console.log("controller", controller.address)

        // const controllers1 = await vaultFactoryV2.controllers(controller.address);
        // console.log("controllers1", controllers1);

        // await vaultFactoryV2.connect(signer).whitelistController(controller.address);

        // const controllers2 = await vaultFactoryV2.controllers(controller.address);
        // console.log("controllers2", controllers2);

        // const AToken = await ethers.getContractFactory("AToken");
        // aToken = await AToken.deploy();
        // await aToken.deployed();
        
        // const BToken = await ethers.getContractFactory("BToken");
        // bToken = await BToken.deploy();
        // await bToken.deployed();
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


        
        const marketConfigurationCalldata_nodepeg= {
            token : MIM ,
            strike : 99900000 ,
            oracle : oracle ,
            underlyingAsset : WETH ,
            name : "MIM Token" ,
            tokenURI : "MIM" ,
            controller : controller.address ,
        }
        // console.log("marketConfigurationCalldata_nodepeg", marketConfigurationCalldata_nodepeg);

        const depegStrike = ethers.utils.parseEther("2");
        const marketConfigurationCalldata_depeg= {
            token : USDC ,
            strike : depegStrike ,
            oracle : oracle ,
            underlyingAsset : WETH ,
            name : "USD Coin" ,
            tokenURI : "USDC" ,
            controller : controller.address ,
        }

        // console.log("marketConfigurationCalldata_depeg", marketConfigurationCalldata_depeg);

        const controllers = await vaultFactoryV2.controllers(controller.address);
        console.log("controllers", controllers);

        const marketId = await vaultFactoryV2.getMarketId(
            marketConfigurationCalldata_nodepeg.token, 
            marketConfigurationCalldata_nodepeg.strike, 
            marketConfigurationCalldata_nodepeg.underlyingAsset);
        console.log("marketId", marketId);

        const marketIdToVaults = await vaultFactoryV2.marketIdToVaults(marketId, 0);
        console.log("marketIdToVaults", marketIdToVaults);

        [premium, collateral, marketId] = await vaultFactoryV2.connect(signer).createNewMarket(marketConfigurationCalldata_nodepeg, {gasLimit : 1000000});

        console.log("premium", premium)

        const marketIdInfo = await vaultFactoryV2.getMarketInfo(marketId);
        console.log("marketIdInfo", marketIdInfo);

        [depegPremium, depegCollateral, depegMarketId] = await vaultFactoryV2.connect(signer).createNewMarket(marketConfigurationCalldata_depeg);

        premiumContract = await ethers.getContractAt('VaultV2', premium);
        collateralContract = await ethers.getContractAt('VaultV2', collateral);

        depegPremiumContract = await ethers.getContractAt('VaultV2', depegPremium);
        depegCollateralContract = await ethers.getContractAt('VaultV2', depegCollateral);

        begin = await time.latest() + (1 * 24 * 60 * 60);
        end = await time.latest() + (3 * 24 * 60 * 60);
        fee = 50;

        [epochId, ] = await vaultFactoryV2.createEpoch(marketId, begin, end, fee);

        [depegEpochId, ] = await vaultFactoryV2.createEpoch(depegMarketId, begin, end, fee);

        const mintWeth = ether.utils.parseEther("100");
        await WethContract.connect(USER).deposit({value: mintWeth});

    })

    it("test end epoch with no depeg event", async function() {
        await WethContract.connect(USER).approve(premium, DEPOSIT_AMOUNT);
        await WethContract.connect(USER).approve(collateral, DEPOSIT_AMOUNT);

        await premiumContract.connect(USER).deposit(epochId, DEPOSIT_AMOUNT, USER.address);
        await collateralContract.connect(USER).deposit(epochId, DEPOSIT_AMOUNT, USER.address);

        console.log(premiumContract.balanceOf(USER.address));
        console.log(collateralContract.balanceOf(USER.address));
        
        await increaseTime(5);
        
        await controller.triggerEndEpoch(marketId, epochId);
        
        const premiumBalance = await premiumContract.connect(USER).previewWithdraw(epochId, DEPOSIT_AMOUNT);
        console.log("premiumBalance", premiumBalance);
        
        const collateralBalance = await collateralContract.connect(USER).previewWithdraw(epochId, DEPOSIT_AMOUNT);
        console.log("collateralBalance", collateralBalance);

        await premiumContract.connect(USER).withdraw(epochId, DEPOSIT_AMOUNT, USER, USER);
        await collateralContract.connect(USER).withdraw(epochId, DEPOSIT_AMOUNT, USER, USER);
        console.log(premiumContract.balanceOf(USER.address));
        console.log(collateralContract.balanceOf(USER.address));
        
    })

    it("test epoch with depeg event", async function(){
        await WethContract.connect(USER).approve(depegPremium, PREMIUM_DEPOSIT_AMOUNT);
        await WethContract.connect(USER).approve(depegCollateral, COLLAT_DEPOSIT_AMOUNT);

        await depegPremiumContract.connect(USER).deposit(epochId, PREMIUM_DEPOSIT_AMOUNT, USER.address);
        await depegCollateralContract.connect(USER).deposit(epochId, COLLAT_DEPOSIT_AMOUNT, USER.address);

        console.log(depegPremiumContract.balanceOf(USER.address));
        console.log(depegCollateralContract.balanceOf(USER.address));
        
        await increaseTime(1.5);

        await controller.triggerDepeg(depegMarketId, depegEpochId);

        const premiumfinalTVL = depegCollateralContract.finalTVL(depegEpochId);
        const collateralfinalTVL = depegPremiumContract.finalTVL(depegEpochId);
        console.log("premiumfinalTVL", premiumfinalTVL);
        console.log("collateralfinalTVL", collateralfinalTVL);


        const premiumShare = await depegPremiumContract.connect(USER).previewWithdraw(depegEpochId, PREMIUM_DEPOSIT_AMOUNT);
        console.log("premiumShare", premiumShare);
        
        const collateralShare = await depegCollateralContract.connect(USER).previewWithdraw(depegEpochId, COLLAT_DEPOSIT_AMOUNT);
        console.log("collateralShare", collateralShare);

        await depegPremiumContract.connect(USER).withdraw(depegEpochId, PREMIUM_DEPOSIT_AMOUNT, USER, USER);
        await depegCollateralContract.connect(USER).withdraw(depegEpochId, COLLAT_DEPOSIT_AMOUNT, USER, USER);
        console.log(depegPremiumContract.balanceOf(USER.address));
        console.log(depegCollateralContract.balanceOf(USER.address));
        
    })

    it("test epoch with null epoch", async function() {
        await WethContract.connect(USER).approve(premium, DEPOSIT_AMOUNT);
        await WethContract.connect(USER).approve(collateral, DEPOSIT_AMOUNT);

        await collateralContract.connect(USER).deposit(epochId, COLLAT_DEPOSIT_AMOUNT, USER.address);
        console.log(premiumContract.balanceOf(USER.address));
        console.log(collateralContract.balanceOf(USER.address));

        await increaseTime(5);
        
        await controller.triggerNullEpoch(marketId, epochId);

        const premiumStatus = await premiumContract.connect(USER).epochResolved(epochId);
        const collateralStatus = await collateralContract.connect(USER).epochResolved(epochId);
        console.log("premiumStatus", premiumStatus)
        console.log("collateralStatus", collateralStatus)

        const premiumNullStatus = await premiumContract.connect(USER).epochNull(epochId);
        const collateralNullStatus = await collateralContract.connect(USER).epochNull(epochId);
        console.log("premiumNullStatus", premiumNullStatus)
        console.log("collateralNullStatus", collateralNullStatus)


        
    })

});